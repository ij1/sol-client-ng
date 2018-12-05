import Vue from 'vue';
import L from 'leaflet'
import rbush from 'rbush';
import { PROJECTION } from '../../lib/sol.js';

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
    leader: null,
    selected: [],
    hover: [],
    searchTree: rbush(9, ['.lng', '.lat', '.lng', '.lat']),
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

        dtg: parseFloat(boatData.dtg),
        dbl: boatData.dbl,

        lat: boatData.lat,
        lon: boatData.lon,
        cog: parseFloat(boatData.cog),

        ranking: parseInt(boatData.ranking),
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
      let searchData = [];

      for (let boat of update.fleet) {
        const id = boat.id;
        const latLng = L.latLng(boat.lat, boat.lon);

        let searchItem = {
          lng: latLng.lng,
          lat: latLng.lat,
          id: boat.id,
        };
        Object.freeze(searchItem);
        searchData.push(searchItem);

        if (typeof state.id2idx[id] !== 'undefined') {
          const idx = state.id2idx[id];
          state.boat[idx].name = boat.name;
          state.boat[idx].type = boat.type;
          state.boat[idx].latLng = latLng;
          state.boat[idx].cog = parseFloat(boat.cog);

          state.boat[idx].ranking = parseInt(boat.ranking);
          state.boat[idx].dtg = parseFloat(boat.dtg);
          state.boat[idx].dbl = boat.dbl;
          state.boat[idx].log = boat.log;
          state.boat[idx].current_leg = boat.current_leg;

          if (state.boat[idx].ranking === 1) {
            state.leader = id;
            state.boat[idx].color = { r: 204, g: 0, b: 204 };
          } else {
            /* idx === 0 is player's boat, don't set its color */
            if (idx > 0) {
              state.boat[idx].color = {
                r: boat.color_R,
                g: boat.color_G,
                b: boat.color_B,
              };
            }
          }
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
          boat.cog = parseFloat(boat.cog);
          boat.ranking = parseInt(boat.ranking);
          boat.dtg = parseFloat(boat.dtg);

          if (boat.ranking === 1) {
            state.leader = id;
            boat.color = { r: 204, g: 0, b: 204 };
          }
          Vue.set(state.id2idx, id, state.boat.length);
          state.boat.push(boat);

          state.newBoatId = id;

        }
      }

      state.searchTree.clear();
      state.searchTree.load(searchData);
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
    setSelected (state, ids) {
      state.selected = ids;
    },
    setHover (state, ids) {
      state.hover = ids;
    },
  },

  getters: {
    /* pixelDistance for these search function is x or y distance, thus
     * searching squares rather than circles
     */
    searchAt: (state, getters) => (latLng, zoom, pixelDistance) => {
      const dummyBBox = L.latLngBounds(latLng, latLng);
      return getters['searchBBox'](dummyBBox, zoom, pixelDistance);
    },
    searchBBox: (state) => (latLngBounds, zoom, pixelDistance) => {
      let bl = PROJECTION.latLngToPoint(latLngBounds.getSouthWest(), zoom);
      let tr = PROJECTION.latLngToPoint(latLngBounds.getNorthEast(), zoom);
      bl = bl.add(L.point(-pixelDistance, pixelDistance));
      tr = tr.add(L.point(pixelDistance, -pixelDistance));
      const swWithMargin = PROJECTION.pointToLatLng(bl, zoom);
      const neWithMargin = PROJECTION.pointToLatLng(tr, zoom);
      // FIXME: is NaN check needed after unprojects with enlarged coords?
      const needle = {
        minX: swWithMargin.lng,
        minY: swWithMargin.lat,
        maxX: neWithMargin.lng,
        maxY: neWithMargin.lat,
      };

      return state.searchTree.search(needle);
    },

    boatFromId: (state) => (id) => {
      const idx = state.id2idx[id];
      return state.boat[idx];
    },
    /* Does not use state, just to use common code for boat colors */
    boatColor: () => (boat) => {
      return 'rgb(' + boat.color.r + ',' + boat.color.g + ',' + boat.color.b + ', 0.8)';
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
