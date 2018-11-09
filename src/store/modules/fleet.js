import Vue from 'vue';
import L from 'leaflet'

export default {
  namespaced: true,

  state: {
    /* Set to latest known new boat ID. Once metainfo for it arrives, we
     * should have it for all boats if the SOL API is sane.
     */
    newBoatId: null,
    fleetTime: 0,
    boat: [],
    id2idx: {},
  },

  mutations: {
    initMyBoat (state, boatData) {
      if (typeof state.id2idx[boatData.id] !== 'undefined') {
        return;
      }
      state.fleetTime = boatData.time;
      Vue.set(state.id2idx, boatData.id, state.boat.length);
      state.boat.push({
        id: boatData.id,
        name: boatData.name,
        color: {
          r: 255,
          g: 0,
          b: 255,
        },
        type: '',

        dtg: boatData.dtg,
        dbl: boatData.dbl,

        lat: boatData.lat,
        lon: boatData.lon,
        cog: boatData.cog,

        ranking: boatData.ranking,
        current_leg: boatData.current_leg,
        log: 0,

        latLng: L.latLng(boatData.lat, boatData.lon),
        syc: false,
        country: null,
        trace: [],
      });
    },
    updateFleet (state, update) {
      state.fleetTime = update.timestamp;

      for (let boat of update.fleet) {
        const id = boat.id;
        const latLng = L.latLng(boat.lat, boat.lon);

        if (typeof state.id2idx[id] !== 'undefined') {
          const idx = state.id2idx[id];
          state.boat[idx].name = boat.name;
          state.boat[idx].type = boat.type;
          state.boat[idx].latLng = latLng;
          state.boat[idx].cog = boat.cog;

          state.boat[idx].ranking = boat.ranking;
          state.boat[idx].dtg = boat.dtg;
          state.boat[idx].dbl = boat.dbl;
          state.boat[idx].log = boat.log;
          state.boat[idx].current_leg = boat.current_leg;

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

          boat.trace = [];

          Vue.set(state.id2idx, id, state.boat.length);
          state.boat.push(boat);

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
        if (typeof state.id2idx[id] !== 'undefined') {
          const idx = state.id2idx[id];

          if (state.newBoatId === id) {
            state.newBoatId = null;
          }
          state.boat[idx].syc = (boat.$.syc === 'True');
          state.boat[idx].country = boat.$.c;
        }
      }
    },
    updateBoatTrace (state, traceData) {
      const id = traceData.id;
      if (typeof state.id2idx[id] !== 'undefined') {
        const idx = state.id2idx[traceData.id];
        state.boat[idx].trace = traceData.trace;
      }
    },
  },

  actions: {
    fetchRace({rootState, state, rootGetters, commit, dispatch}) {
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
          const now = rootGetters['time/now']();
          if ((typeof raceInfo.boats !== 'undefined') &&
              (typeof raceInfo.boats.boat !== 'undefined')) {
            let boatList = raceInfo.boats.boat;
            if (!Array.isArray(boatList)) {
              boatList = [boatList];
            }

            commit('updateFleet', {
              timestamp: now,
              fleet: boatList,
            });

            if (state.newBoats !== null) {
              dispatch('fetchMetainfo');
            }
            dispatch('fetchTraces');
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
        useArrays: false,
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

    fetchTraces({rootState, state, commit, dispatch}) {
      const getDef = {
        url: "/webclient/traces_" + rootState.auth.race_id + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'content',
        compressedPayload: true,

        dataHandler: (traces) => {
          let boatList = traces.boat;
          if (typeof boatList === 'undefined') {
            return;
          }
          if (!Array.isArray(boatList)) {
            boatList = [boatList];
          }
          for (let boat of boatList) {
            const id = boat.id;

            /* Update only for the existing boats */
            if (typeof state.id2idx[id] === 'undefined') {
              continue;
            }

            let trace = [];
            for (let lngLatTxt of boat.data.split(/ /)) {
              const lngLatArr = lngLatTxt.split(/,/);
              trace.push(L.latLng(lngLatArr[1], lngLatArr[0]));
            }

            commit('updateBoatTrace', {
              id: id,
              trace: trace,
            });
          }
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
