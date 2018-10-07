import Vue from 'vue';
import L from 'leaflet'
import raceMessageModule from './racemessages.js'

export default {
  namespaced: true,
  modules: {
    messages: raceMessageModule,
  },

  state: {
    loaded: false,
    info: {},
    messages: {
      racemsgs: [],
      lastId: 0,
      expectedId: 0,
    },
    boundary: [],
    route: [],
    finish: [],
    traces: null,
  },

  mutations: {
    init (state, raceInfo) {
      state.boundary = [L.latLng(raceInfo.minlat, raceInfo.minlon),
                        L.latLng(raceInfo.maxlat, raceInfo.maxlon)];

      for (let i = 0; i < raceInfo.course.waypoint.length; i++) {
        let waypoint = raceInfo.course.waypoint[i];
        const idx = parseInt(waypoint.order) - 1;
        waypoint.latLng = L.latLng(waypoint.lat, waypoint.lon);
        // ADDME: need to calculate the side to pass
        Vue.set(state.route, idx, waypoint);
      }
      // ADDME: calculate finish line end points
      delete raceInfo.course.waypoint;
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
          dispatch('weather/fetchInfo', null, {root: true});
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
