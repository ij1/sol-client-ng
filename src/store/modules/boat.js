import L from 'leaflet';
import { radToDeg, degToRad, UTCToMsec, minToMsec } from '../../lib/utils.js';
import { minTurnAngle } from '../../lib/nav.js';
import { solBoatPolicy, PR_MARK_BOAT, SOL_TICK_PROCESSING } from '../../lib/sol.js';
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
    tickLen: null,
    currentSteering: 'twa',
    currentSteeringInvalid: false,
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
      if (data.last_cmd_type === 'cc' || data.last_cmd_type === 'twa') {
        state.currentSteering = data.last_cmd_type;
        state.currentSteeringInvalid = false;
      } else {
        state.currentSteeringInvalid = true;
      }
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
    updateTickLen (state, newTick) {
      state.tickLen = newTick;
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

        boatData.boat.finish_time = UTCToMsec(boatData.boat.finish_time);
        if (boatData.boat.finish_time !== null) {
          /* Boat update timestamp does not update after finish */
          let newTime = Math.max(boatData.boat.finish_time, now)
          if (!firstFetch && oldTime > 0) {
            newTime = Math.max(newTime, oldTime);
          }
          boatData.boat.time = newTime;
        } else {
          /* Rough clock correctness check (compare to server timestamp) */
          if (Math.abs(now - boatData.boat.time) > minToMsec(2)) {
            dispatch('time/checkOffset', null, {root: true});
          } else if (firstFetch) {
            commit('weather/initTime', boatData.boat.time, {root: true});
          }
        }

        /* Older game time than what we have already? */
        if (!firstFetch && (boatData.boat.time < oldTime)) {
          dispatch('diagnostics/add', 'boat: timestamp reversion!', {root: true});
          throw new SolapiError('data', 'Boat timestamp reversion!');
        }

        if ((boatData.boat.last_cmd_type !== 'cc') &&
            (boatData.boat.last_cmd_type !== 'twa')) {
          dispatch('diagnostics/add', 'boat: current steering missing!', {root: true});
        }

        boatData.boat.latLng =  L.latLng(boatData.boat.lat, boatData.boat.lon);
        boatData.boat.wrappedLatLng = rootGetters['race/latLngToRaceBounds'](boatData.boat.latLng);
        boatData.boat.type = state.type;
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

        if (state.instruments.time.value == oldTime) {
          if (state.tickLen !== null) {
            if (state.instruments.time.value + state.tickLen < now) {
              dispatch('diagnostics/add', 'net: boat fetched too early', {root: true});
            } else {
              if (rootState.diagnostics.cfg.extraNetDebug.value) {
                dispatch('diagnostics/add', 'net: boat expected early fetch', {root: true});
              }
            }
          }
        } else {
          let tickLen = null;
          if (!firstFetch && state.finishTime === null && oldTime > 0) {
            tickLen = state.instruments.time.value - oldTime;
            if (tickLen < 0 || tickLen > 35000) {
              dispatch('diagnostics/add', 'net: boat rejected tick len ' +
                       tickLen, {root: true});
              tickLen = null;
            }
            if (tickLen !== null) {
              if (state.tickLen !== null &&
                  Math.abs(tickLen - state.tickLen) > 5000) {
                dispatch('diagnostics/add', 'net: boat tick len changed from ' +
                         state.tickLen + ' to ' + tickLen, {root: true});
              }
              commit('updateTickLen', tickLen);
            }
          }

          if (rootState.diagnostics.cfg.extraNetDebug.value) {
            const latency = now - state.instruments.time.value;
            dispatch('diagnostics/add', 'net: boat fetch latency ' + latency +
                     (tickLen !== null ? (' tick length: ' + tickLen) : ''),
                     {root: true});
          }
        }

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
        const now = rootGetters['time/now']();

        let next_fetch = state.instruments.time.value +
                         10000 + SOL_TICK_PROCESSING;
        let delay = next_fetch - now;

        if (state.finishTime !== null) {
          delay = 30000;
        } else if (state.tickLen === null) {
          delay = 10000;
        } else if (delay < 0 && state.tickLen > 15000) {
          delay += Math.ceil(delay / -10000) * 10000;
          delay = Math.max(delay, 1000);
        } else {
          /* Switch to 10s interval at +3s */
          delay = Math.max(delay, delay < -3000 ? 10000 : 1000);
          delay = Math.min(delay, 15000);
        }

        if (delay < 3000 || delay > 40000 ||
            rootState.diagnostics.cfg.extraNetDebug.value) {
          dispatch('diagnostics/add', 'net: boat fetch delay ' + delay,
                   {root: true});
        }
        solapiRetryDispatch(dispatch, 'fetch', undefined, delay);
      }
    },
  },
}
