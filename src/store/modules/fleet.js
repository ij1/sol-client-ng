import Vue from 'vue';
import L from 'leaflet'

export default {
  namespaced: true,

  state: {
    /* Set to latest known new boat ID. Once metainfo for it arrives, we
     * should have it for all boats if the SOL API is sane.
     */
    newBoatId: null,
    boat: {},
    traces: null,
  },

  mutations: {
    updateTraces (state, traces) {
      state.traces = traces
    },
    updateFleet (state, fleet) {
      for (let boat of fleet) {
        const id = boat.id;
        const latLng = L.latLng(boat.lat, boat.lon);

        if (typeof state.boat[id] !== 'undefined') {
          state.boat[id].name = boat.name;
          state.boat[id].latLng = latLng;
          state.boat[id].cog = boat.cog;

          state.boat[id].ranking = boat.ranking;
          state.boat[id].dtg = boat.dtg;
          state.boat[id].dbl = boat.dbl;
          state.boat[id].log = boat.log;
          state.boat[id].current_leg = boat.current_leg;

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

          Vue.set(state.boat, id, boat);

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
        if (typeof state.boat[id] !== 'undefined') {
          if (state.newBoatId === id) {
            state.newBoatId = null;
          }
          state.boat[id].syc = (boat.$.syc === 'True');
          state.boat[id].country = boat.$.c;
        }
      }
    },
  },

  actions: {
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
