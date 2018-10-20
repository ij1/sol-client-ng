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
    boundary: [],
    route: [],
    finish: [],

    /* Set to latest known new boat ID. Once metainfo for it arrives, we
     * should have it for all boats if the SOL API is sane.
     */
    newBoatId: null,
    fleet: {},
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
    },
    updateFleet (state, fleet) {
      for (let boat of fleet) {
        const id = boat.id;
        const latLng = L.latLng(boat.lat, boat.lon);

        if (typeof state.fleet[id] !== 'undefined') {
          state.fleet[id].name = boat.name;
          state.fleet[id].latLng = latLng;
          state.fleet[id].cog = boat.cog;

          state.fleet[id].ranking = boat.ranking;
          state.fleet[id].dtg = boat.dtg;
          state.fleet[id].dbl = boat.dbl;
          state.fleet[id].log = boat.log;
          state.fleet[id].current_leg = boat.current_leg;

        } else {
          delete boat.lat;
          delete boat.lon;
          boat.latLng = latLng;

          boat.syc = false;
          boat.country = null;

          boat.color = {
            r: boat.color_R,
            g: boat.color_G,
            b: boat.color_B,
          };
          delete boat.color_R;
          delete boat.color_G;
          delete boat.color_B;

          Vue.set(state.fleet, id, boat);

          state.newBoatId = id;
        }
      }
    },
    updateFleetMeta (state, meta) {
      for (let boat of meta) {
        const id = boat.$.id;

        /* If not in the fleet yet, postpone all work to the next metainfo
         * for this boat in order to have simpler state invariants.
         */
        if (typeof state.fleet[id] !== 'undefined') {
          if (state.newBoatId === id) {
            state.newBoatId = null;
          }
          state.fleet[id].syc = (boat.$.syc === 'True');
          state.fleet[id].country = boat.$.c;
        }
      }
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
          dispatch('fetchRace');
          // dispatch('fetchTraces');
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },

    fetchRace({rootState, state, commit, dispatch}) {
      const getDef = {
        url: "/webclient/race_" + rootState.auth.race_id + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'race',
        interval: 30000,
        compressedPayload: true,

        dataHandler: (raceInfo) => {
          if ((typeof raceInfo.boats !== 'undefined') &&
              (typeof raceInfo.boats.boat !== 'undefined')) {
            let boatList = raceInfo.boats.boat;
            if (!Array.isArray(boatList)) {
              boatList = [boatList];
            }

            commit('updateFleet', boatList);

            if (state.newBoats !== null) {
              dispatch('fetchMetainfo');
            }
            // dispatch('fetchTraces');
          }
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },

    fetchMetainfo({rootState, commit, dispatch}) {
      const getDef = {
        url: "/webclient/metainfo_" + rootState.auth.race_id + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: true,
        dataField: 'boatinfo',
        compressedPayload: true,

        dataHandler: (metaInfo) => {
          let boatList = metaInfo.b;
          if (typeof boatList !== 'undefined') {
            if (!Array.isArray(boatList)) {
              boatList = [boatList];
            }
            commit('updateFleetMeta', boatList);
          }
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
        compressedPayload: true,

        dataHandler: (raceInfo) => {
          console.log(raceInfo);
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },

  },
}
