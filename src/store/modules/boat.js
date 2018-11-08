import Vue from 'vue';
import L from 'leaflet'
import steeringModule from './steering'
import instrumentModule from './instruments';

export default {
  namespaced: true,

  modules: {
    steering: steeringModule,
    instruments: instrumentModule,
  },

  state: {
    position: null,
    polar: null,
  },

  mutations: {
    updateBoat (state, data) {
      for (let i of state.instruments.list) {
        let val = data[state.instruments[i].datafield];
        if (typeof state.instruments[i].notNum !== 'undefined') {
          val = parseFloat(val);
          if (!Number.isFinite(val)) {
            val = undefined;
          }
        }
        Vue.set(state.instruments[i], 'value', val);
      }
      state.position = L.latLng(data.lat, data.lon);
    },
    setPolar (state, polar) {
      state.polar = polar
    },

    setFetching (state, param) {
      state.fetching[param.id] = param.state;
    }
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
        interval: 10000,
        refetchAction: 'boat/fetch',

        dataHandler: (boatData) => {
          boatData.boat.time = rootGetters['time/now']();
          let chatData = boatData.chats;
          chatData.id = nextChatroom;
      
          commit('updateBoat', boatData.boat);
          commit('weather/minTime', state.instruments.time, {root: true});

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
        },
      };

      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
