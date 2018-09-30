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
    dcs: [],
    fetching: {
      dcs: false,
    },
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
    updateDCs (state, dcList) {
      state.dcs = dcList
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
          let lmi = boatData.lmi;
      
          commit('updateBoat', boatData['boat']);

          if (lmi !== undefined) {
            lmi = parseInt(lmi);
            if (Number.isFinite(lmi)) {
              commit('race/messages/updateExpected', lmi, {root: true});
            }
          }

          if ((chatData.chat !== undefined) && (chatData.timestamp !== undefined)) {
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

    fetchDCs({state, rootState, commit, dispatch}) {
      /* FIXME: should queue until the previous req is over */
      if (state.fetching.dcs) {
        return;
      }

      const getDef = {
        url: '/webclient/command/delayed/',
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'commands',

        dataHandler: (dcData) => {
          if (dcData.hasOwnProperty('cmd')) {
            let dcList = dcData.cmd
          
            if (!Array.isArray(dcList)) {
              dcList = [dcList];
            }
            commit('updateDCs', dcList);
          }
          commit('setFetching', {id: 'dcs', state: false });
        },
      };

      commit('setFetching', {id: 'dcs', state: true });
      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
