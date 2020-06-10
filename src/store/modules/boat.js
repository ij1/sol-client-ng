import L from 'leaflet';
import { radToDeg, degToRad, UTCToMsec } from '../../lib/utils.js';
import { minTurnAngle } from '../../lib/nav.js';
import { solBoatPolicy, PR_MARK_BOAT } from '../../lib/sol.js';
import polarModule from './polar';
import steeringModule from './steering';
import instrumentModule from './instruments';
import { solapiRetryDispatch, SolapiError } from '../../lib/solapi.js';
import { latLngInDark } from '../../lib/sun.js';

export default {
  namespaced: true,

  modules: {
    polar: polarModule,
    steering: steeringModule,
    instruments: instrumentModule,
  },

  state: {
    id: null,
    name: null,
    type: '',
    ranking: null,
    dtg: null,
    position: null,
    lastRoundedMark: 0,
    finishTime: null,
    currentSteering: 'twa',
    /*
     * Stores the visual offset (multiple of 360) that brings the boat
     * closest to the map center.
     */
    visualLngOffset: 0,

    chatlessCount: 0,
    chatRetryMark: 0,
    chatlessThreshold: 3,  /* Degrade to chatless when enough failures in row */
    chatlessDummyRoom: -1,
  },

  mutations: {
    updateBoat (state, data) {
      state.id = data.id;
      state.name = data.name;
      state.position = L.latLng(data.lat, data.lon);
      state.lastRoundedMark = parseInt(data.current_leg);
      state.ranking = parseInt(data.ranking);
      state.dtg = parseFloat(data.dtg);
      state.finishTime = data.finish_time;
      state.currentSteering = data.last_cmd_type;
    },

    setType (state, type) {
      state.type = type;
    },
    updateLngOffset (state, centerLng) {
      let newOffset = 0;
      if (state.position !== null) {
        const minTurn = minTurnAngle(degToRad(centerLng),
                                     degToRad(state.position.lng));
        const endLng = centerLng + radToDeg(minTurn);
        /* CHECKME: What about centerLng exactly at 180? */
        if (Math.abs(endLng) >= 180) {
          newOffset = Math.sign(endLng) * 360;
        }
      }
      if (state.visualLngOffset != newOffset) {
        state.visualLngOffset = newOffset;
      }
    },

    degradedToChatless (state, chatless) {
      if (chatless) {
        state.chatlessCount++;
        if (state.chatRetryMark === 0) {
          state.chatRetryMark = 2;
        }
      } else {
        state.chatlessCount = 0;
        state.chatRetryMark = 0;
      }
    },
    chatRetryFail (state) {
      if (state.chatRetryMark < 10) {
        state.chatRetryMark *= 2;
      } else {
        state.chatRetryMark += 10;
      }
    },
  },

  getters: {
    time: (state) => {
      // CHECKME: is it ok to access submodule state like this (it works)
      return state.instruments.time.value;
    },
    visualPosition: (state) => {
      if (state.position === null) {
        return null;
      }
      return L.latLng(state.position.lat,
                      state.position.lng + state.visualLngOffset);
    },
    inDark: (state, getters) => {
      if (state.position === null) {
        return false;
      }
      return latLngInDark(state.position, getters.time);
    },
    isGuestBoat: (state) => {
      return state.name === 'guest';
    },
    isSolBoat: (state) => {
      return state.name === 'sol';
    },
    isPracticeMark: (state) => {
      return state.name.startsWith(PR_MARK_BOAT);
    },
    publicBoat: (state, getters) => {
      /* Prevent state.name related races */
      if (state.name === null) {
        return true;
      }
      return getters.isGuestBoat || getters.isSolBoat || getters.isPracticeMark;
    },
    allowControl: (state, getters, rootState, rootGetters) => {
      /* Prevent auth race vs boat API races during startup */
      if (state.id === null) {
        return false;
      }
      /* Development version has more rights */
      if (!rootGetters['solapi/isProductionServer']) {
        return true;
      }
      return solBoatPolicy(state.name, rootGetters);
    },
  },

  actions: {
    async fetch ({state, rootState, rootGetters, commit, dispatch}) {
      let getDef = {
        apiCall: 'boat',
      };
      let nextChatroom;
      try {
        const firstFetch = state.id === null;
        nextChatroom = rootGetters['chatrooms/nextRoomToFetch'];
        let chatTimestamp = rootState.chatrooms.rooms[nextChatroom].timestamp;
        let apiStats = rootState.solapi.apiCallStats['boat'];

        /* Degrade to chatless mode if many failures */
        if (typeof apiStats !== 'undefined') {
          if ((apiStats.consecutiveErrors > state.chatlessThreshold) ||
              ((state.chatRetryMark > 0) &&
               (state.chatlessCount < state.chatRetryMark))) {
            nextChatroom = state.chatlessDummyRoom;
            chatTimestamp = 0;
          }
        }

        getDef = {
          apiCall: 'boat',
          url: rootState.race.info.boaturl,
          params: {
            token: rootState.auth.token,
            room_id: nextChatroom,
            timestamp: chatTimestamp,
          },
          useArrays: false,
          dataField: 'data',
        };

        let boatData = await dispatch('solapi/get', getDef, {root: true});
        const now = rootGetters['time/now']();
        boatData.boat.time = UTCToMsec(boatData.boat.last_update_time);
        if (boatData.boat.time === null) {
          throw new SolapiError('data', 'Boat timestamp missing!');
        }
        const chatInfo = {
          id: nextChatroom,
          chatData: boatData.chats,
        };
        const oldTime = state.instruments.time.value;
        const oldPosition = state.position;
        const oldCog = state.cog;

        if (boatData.boat.finish_time.length > 0) {
          boatData.boat.finish_time = UTCToMsec(boatData.boat.finish_time);
          boatData.boat.time = Math.max(boatData.boat.finish_time, now);
        } else {
          boatData.boat.finish_time = null;
        }

        /* Older game time than what we have already? */
        if (!firstFetch && (boatData.boat.time < oldTime)) {
          dispatch('diagnostics/add', 'boat: timestamp reversion!', {root: true});
          throw new SolapiError('data', 'Boat timestamp reversion!');
        }

        boatData.boat.latLng =  L.latLng(boatData.boat.lat, boatData.boat.lon);
        boatData.boat.wrappedLatLng = rootGetters['race/latLngToRaceBounds'](boatData.boat.latLng);
        commit('race/fleet/initMyBoat', boatData.boat, {root: true});
        commit('updateBoat', boatData.boat);
        commit('race/fleet/updateCommandBoat', {
          oldPosition: oldPosition,
          newPosition: state.position,
          wrappedNewPosition: boatData.boat.wrappedLatLng,
          sameCog: Math.abs(radToDeg(minTurnAngle(oldCog, state.cog))) < 0.2,
          move: true,
          rootGetters: rootGetters,
        }, {root: true});
        commit('updateLngOffset', rootState.map.center.lng);
        await dispatch('boat/instruments/updateInstruments', boatData.boat, {root: true});
        commit('weather/boatTimeUpdated', {
          newTime: state.instruments.time.value,
          delta: oldTime > 0 ? state.instruments.time.value - oldTime : null,
        }, {root: true});

        if (typeof boatData.lmi !== 'undefined') {
          let lmi = parseInt(boatData.lmi);
          if (Number.isFinite(lmi)) {
            dispatch('race/messages/updateExpected', lmi, {root: true});
          }
        }

        if (nextChatroom !== state.chatlessDummyRoom) {
          await dispatch('chatrooms/parse', chatInfo, {root: true});
          if (state.chatlessCount > 0) {
            dispatch('diagnostics/add', 'net: chat mode returned to normal', {root: true});
          }
          commit('degradedToChatless', false);
        } else {
          if (state.chatlessCount === 0) {
            dispatch('diagnostics/add', 'net: degraded to chatless mode', {root: true});
          }
          commit('degradedToChatless', true);
        }

        dispatch('race/fetchRaceComponents', null, {root: true});
        if (rootGetters['boat/steering/nextTimeToFetchDCs'] <= now) {
          dispatch('steering/fetchDCs');
        }
      } catch(err) {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
        if ((state.chatlessCount > 0) &&
            (nextChatroom !== state.chatlessDummyRoom)) {
          commit('chatRetryFail');
          dispatch('diagnostics/add', 'net: unsuccessful chat mode probe', {root: true});
        }

        /* Backup fetch if boat API is down, still try the others */
        dispatch('race/fetchRaceComponents', null, {root: true});
      } finally {
        solapiRetryDispatch(dispatch, 'fetch', undefined, 10000);
      }
    },
  },
}
