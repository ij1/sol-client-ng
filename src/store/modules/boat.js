import L from 'leaflet';
import { UTCToMsec } from '../../lib/utils.js';
import polarModule from './polar';
import steeringModule from './steering';
import instrumentModule from './instruments';
import { SkipThenError, solapiRetryDispatch, solapiLogError } from '../../lib/solapi.js';

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
  },

  mutations: {
    updateBoat (state, data) {
      state.id = data.id;
      state.name = data.name;
      state.position = L.latLng(data.lat, data.lon);
      state.lastRoundedMark = parseInt(data.current_leg);
      state.ranking = parseInt(data.ranking);
      state.dtg = parseFloat(data.dtg);
      if (data.finish_time.length > 0) {
        state.finishTime = UTCToMsec(data.finish_time);
      }
      state.currentSteering = data.last_cmd_type;
    },

    setFetching (state, param) {
      state.fetching[param.id] = param.state;
    },

    setType (state, type) {
      state.type = type;
    },
  },

  getters: {
    time: (state) => {
      // CHECKME: is it ok to access submodule state like this (it works)
      return state.instruments.time.value;
    },
  },

  actions: {
    fetch ({state, rootState, rootGetters, commit, dispatch}) {
      const nextChatroom = rootGetters['chatrooms/nextRoomToFetch'];
      const getDef = {
        url: rootState.race.info.boaturl,
        params: {
          token: rootState.auth.token,
          room_id: nextChatroom,
          timestamp: rootState.chatrooms.rooms[nextChatroom].timestamp,
        },
        useArrays: false,
        dataField: 'data',
      };

      dispatch('solapi/get', getDef, {root: true})
      .catch(err => {
        solapiLogError(err);
        throw new SkipThenError();
      })
      .then(boatData => {
        const now = rootGetters['time/now']();
        boatData.boat.time = now;
        let chatData = boatData.chats;
        chatData.id = nextChatroom;

        commit('race/fleet/initMyBoat', boatData.boat, {root: true});
        dispatch('boat/instruments/updateInstruments', boatData.boat, {root: true});
        commit('updateBoat', boatData.boat);
        commit('weather/minTime', state.instruments.time.value, {root: true});

        if (typeof boatData.lmi !== 'undefined') {
          let lmi = parseInt(boatData.lmi);
          if (Number.isFinite(lmi)) {
            commit('race/messages/updateExpected', lmi, {root: true});
          }
        }

        if ((typeof chatData.chat !== 'undefined') &&
            (typeof chatData.timestamp !== 'undefined')) {
          if (!Array.isArray(chatData.chat)) {
            chatData.chat = [chatData.chat];
          }
          commit('chatrooms/updateRoom', chatData, {root: true});
        }
        commit('chatrooms/nextRoom', null, {root: true});

        dispatch('race/fetchRaceComponents', null, {root: true});
      })
      .catch(err => {
        solapiLogError(err);
      })
      .finally(() => {
        solapiRetryDispatch(dispatch, 'fetch', undefined, 10000);
      });
    },
  },
}
