import Vue from 'vue';
import L from 'leaflet'
import raceMessageModule from './racemessages.js'
import fleetModule from './fleet.js'

export default {
  namespaced: true,
  modules: {
    messages: raceMessageModule,
    fleet: fleetModule,
  },

  state: {
    loaded: false,
    info: {},
    boundary: [],
    route: [],
    finish: [],

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
  },

  actions: {
    fetchAuthRaceinfo ({rootState, rootGetters, commit, dispatch}) {
      /* Initialize time before boat/wx is fetched to avoid issues */
      const now = rootGetters['time/now'];
      commit('boat/initTime', now, {root: true});
      commit('weather/initTime', now, {root: true});

      const getDef = {
        url: "/webclient/auth_raceinfo_" + rootState.auth.race_id + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'race',

        dataHandler: (raceInfo) => {
          const polarRawData = raceInfo.boat;
          const chatroomsData = raceInfo.chatrooms.chatroom;

          commit('chatrooms/init', chatroomsData, {root: true});

          delete raceInfo.boat;
          delete raceInfo.chatrooms;
          commit('init', raceInfo);

          commit('boat/setPolar', polarRawData, {root: true});

          /* Start race API fetching */
          dispatch('boat/fetch', null, {root: true});
          dispatch('boat/steering/fetchDCs', null, {root: true});
          dispatch('weather/fetchInfo', null, {root: true});
          dispatch('fleet/fetchRace');
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
