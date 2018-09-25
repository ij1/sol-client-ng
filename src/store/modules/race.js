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
    fetchAuthRaceinfo ({rootState}) {
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

          this.commit('chatrooms/init', chatroomsData, {root: true});

          raceInfo['boat'] = null;
          raceInfo['chatrooms'] = null;
          this.commit('race/init', raceInfo, {root: true});

          this.commit('boat/setPolar', polarRawData, {root: true});

          /* Start race API fetching */
          this.dispatch('boat/fetch', null, {root: true});
          this.dispatch('boat/fetchDCs', null, {root: true});
          // this.dispatch('weather/fetch', null, {root: true});
          // this.dispatch('race/fetchRace', null, {root: true});
          // this.dispatch('race/fetchTraces', null, {root: true});
        },
      }

      this.dispatch('solapi/get', getDef);
    },

    fetchRace({rootState}) {
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

      this.dispatch('solapi/get', getDef);
    
    },

    fetchTraces({rootState}) {
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

      this.dispatch('solapi/get', getDef);
    
    },

  },
}
