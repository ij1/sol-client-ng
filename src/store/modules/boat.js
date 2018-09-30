import L from 'leaflet'
import steeringModule from './steering'

export default {
  namespaced: true,

  modules: {
    steering: steeringModule,
  },

  state: {
    position: null,
    instruments: {},
    polar: null,
  },

  mutations: {
    updateBoat (state, data) {
      state.instruments = data
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
    fetch ({rootState, rootGetters, commit, dispatch}) {
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
          let chatData = boatData['chats'];
          chatData.id = nextChatroom;
      
          commit('updateBoat', boatData['boat']);

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
