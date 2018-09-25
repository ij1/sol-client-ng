export default {
  namespaced: true,

  state: {
    loaded: false,
    info: {},
    route: null,
    traces: null,
  },

  mutations: {
    init (state, raceInfo) {
      state.info = raceInfo
      state.loaded = true
    },
    updateTraces (state, traces) {
      state.traces = traces
    }
  },

  actions: {
    fetchAuthRaceinfo ({rootState, commit, dispatch}) {
      const getDef = {
        url: "/webclient/auth_raceinfo_" + rootState.auth.race_id + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'race',

        dataHandler: (raceInfo) => {
          const polarRawData = raceInfo['boat'];
          const chatroomsData = raceInfo.chatrooms['chatroom'];

          commit('chatrooms/init', chatroomsData, {root: true});

          raceInfo['boat'] = null;
          raceInfo['chatrooms'] = null;
          commit('init', raceInfo);

          commit('boat/setPolar', polarRawData, {root: true});

          /* Start race API fetching */
          dispatch('boat/fetch', null, {root: true});
          dispatch('boat/steering/fetchDCs', null, {root: true});
          // dispatch('weather/fetch', null, {root: true});
          // dispatch('fetchRace');
          // dispatch('fetchTraces');
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },

    fetchRace({rootState, dispatch}) {
      const getDef = {
        url: "/webclient/race_" + rootState.auth.race_id + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: true,
        dataField: 'race',

        dataHandler: (raceInfo) => {
          console.log(raceInfo);
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    
    },

    fetchTraces({rootState, dispatch}) {
      const getDef = {
        url: "/webclient/traces_" + rootState.auth.race_id + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: true,
        dataField: 'traces',

        dataHandler: (raceInfo) => {
          console.log(raceInfo);
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    
    },

  },
}
