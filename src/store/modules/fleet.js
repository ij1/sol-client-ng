import Vue from 'vue';
import L from 'leaflet';
import rbush from 'rbush';
import { minToMsec, secToMsec } from '../../lib/utils.js';
import { gcCalc } from '../../lib/nav.js';
import { PROJECTION, EARTH_R } from '../../lib/sol.js';

export default {
  namespaced: true,

  state: {
    /* Set to latest known new boat ID. Once metainfo for it arrives, we
     * should have it for all boats if the SOL API is sane.
     */
    newBoatId: null,
    fleetTime: 0,
    fleetFetchInterval: secToMsec(55),
    tracesTime: 0,
    tracesFetchInterval: minToMsec(3),
    boat: [],
    id2idx: {},
    leader: null,
    boatTypes: new Set(),    /* Sets are not not reactive! */
    boatTypesCount: 0,       /* works around lack of reactivity */
    selected: [],
    hover: [],
    searchTree: rbush(9, ['.lng', '.lat', '.lng', '.lat']),
    playerBoatIdx: 0,
  },

  mutations: {
    initMyBoat (state, boatData) {
      if (typeof state.id2idx[boatData.id] !== 'undefined') {
        return;
      }
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
        dbl: parseFloat(boatData.dbl),

        cog: parseFloat(boatData.cog),

        ranking: parseInt(boatData.ranking),
        lastRoundedMark: parseInt(boatData.current_leg),
        log: 0,

        latLng: boatData.latLng,
        wrappedLatLng: boatData.wrappedLatLng,
        syc: false,
        country: null,
        trace: [boatData.wrappedLatLng],
      });
    },
    updateFleet (state, update) {
      state.fleetTime = update.timestamp;

      for (let boat of update.fleet) {
        const id = boat.id;

        if (typeof state.id2idx[id] !== 'undefined') {
          const idx = state.id2idx[id];
          state.boat[idx].name = boat.name;

          state.boat[idx].latLng = boat.latLng;
          /* Store position to trace if moved. */
          if (!state.boat[idx].wrappedLatLng.equals(boat.wrappedLatLng)) {
            // ADDME: consider removing constant cog points, maybe not useful?
            // ADDME: if cog changed a lot, calculate an intersection too?
            // FIXME: What if traces API fails, this could grow very large.
            state.boat[idx].trace.push(boat.wrappedLatLng);
          }
          state.boat[idx].cog = boat.cog;
          state.boat[idx].ranking = boat.ranking;
          state.boat[idx].dtg = boat.dtg;
          state.boat[idx].dbl = boat.dbl;
          state.boat[idx].log = boat.log;
          state.boat[idx].lastRoundedMark = boat.lastRoundedMark;
          if (idx > state.playerBoatIdx) {
            state.boat[idx].color = boat.color;
          }

        } else {
          Vue.set(state.id2idx, id, state.boat.length);

          state.boat.push({
            id: boat.id,
            latLng: boat.latLng,
            wrappedLatLng: boat.wrappedLatLng,
            name: boat.name,
            color: boat.color,
            type: boat.type,
            dtg: boat.dtg,
            dbl: boat.dbl,
            cog: boat.cog,
            ranking: boat.ranking,
            lastRoundedMark: boat.lastRoundedMark,
            log: boat.log,
            syc: false,
            country: null,
            trace: [boat.wrappedLatLng],
          });

          state.newBoatId = id;
        }
      }

      state.leader = update.leaderId;

      state.searchTree.clear();
      state.searchTree.load(update.searchData);

      for (let boatType of update.boatTypes) {
        if (!state.boatTypes.has(boatType)) {
          state.boatTypes.add(boatType);
        }
      }
      state.boatTypesCount = state.boatTypes.length;
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
        state.tracesTime = traceData.time;
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

    multiClassRace: (state) => {
      return state.boatTypes.count > 1;
    },

    nextTimeToFetch: (state) => {
      return state.fleetTime + state.fleetFetchInterval;
    },
    nextTimeToFetchTraces: (state) => {
      return state.tracesTime + state.tracesFetchInterval;
    }
  },

  actions: {
    fetchRace({rootState, state, getters, rootGetters, commit, dispatch}) {
      const getDef = {
        url: "/webclient/race_" + rootState.auth.raceId + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'race',
        compressedPayload: true,
      };
      if (rootGetters['solapi/isLocked']('fleet')) {
        return;
      }
      commit('solapi/lock', 'fleet', {root: true});

      dispatch('solapi/get', getDef, {root: true})
      .then(raceInfo => {
        const now = rootGetters['time/now']();

        commit('race/updateMessage', raceInfo.message, {root: true});

        if ((typeof raceInfo.boats !== 'undefined') &&
            (typeof raceInfo.boats.boat !== 'undefined')) {
          let boatList = raceInfo.boats.boat;
          if (!Array.isArray(boatList)) {
            boatList = [boatList];
          }

          let myBoatNew = null;
          let leaderId = null;
          let boatTypes = new Set();
          let searchData = [];
          const inPractice = rootGetters['race/isPracticePeriod'];

          for (let boat of boatList) {
            boat.latLng = L.latLng(boat.lat, boat.lon);
            boat.wrappedLatLng = rootGetters['race/latLngToRaceBounds'](boat.latLng);

            if (!boat.name.startsWith('Practice_Mark') || inPractice) {
              for (let ddeg = -360; ddeg <= 360; ddeg += 360) {
                let searchItem = {
                  lng: boat.latLng.lng + ddeg,
                  lat: boat.latLng.lat,
                  id: boat.id,
                };
                Object.freeze(searchItem);
                searchData.push(searchItem);
              }
            }
            delete boat.lat;
            delete boat.lon;

            boat.cog = parseFloat(boat.cog);
            boat.ranking = parseInt(boat.ranking);
            boat.dtg = parseFloat(boat.dtg);
            boat.dbl = parseFloat(boat.dbl);
            boat.log = parseFloat(boat.log);

            boat.lastRoundedMark = parseInt(boat.current_leg);
            delete boat.current_leg;

            boat.color = {
              r: boat.color_R,
              g: boat.color_G,
              b: boat.color_B,
            }
            delete boat.color_R;
            delete boat.color_G;
            delete boat.color_B;
            if (boat.ranking === 1) {
              boat.color = { r: 204, g: 0, b: 204 };
              leaderId = boat.id;
            }
            if (boat.id === rootState.boat.id) {
              myBoatNew = boat;
            }
            if (boat.type !== 'Tender boat') {
              boatTypes.add(boat.type);
            }
          }

          for (let boat of boatList) {
            boat.distance = gcCalc(myBoatNew.latLng, boat.latLng).distance *
                              EARTH_R / 1852;
          }

          commit('updateFleet', {
            timestamp: now,
            fleet: boatList,
            leaderId: leaderId,
            boatTypes: boatTypes,
            searchData: searchData,
          });

          if (state.newBoatId !== null) {
            dispatch('fetchMetainfo');
          }
          if (getters['nextTimeToFetchTraces'] <= now) {
            dispatch('fetchTraces');
          }
        }
      })
      .catch(err => {
        commit('solapi/logError', {
          apiCall: 'fleet',
          error: err,
        }, {root: true});
      })
      .finally(() => {
        commit('solapi/unlock', 'fleet', {root: true});
      });
    },

    fetchMetainfo({rootState, commit, dispatch}) {
      const getDef = {
        url: "/webclient/metainfo_" + rootState.auth.raceId + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'boatinfo',
        compressedPayload: true,
      };

      dispatch('solapi/get', getDef, {root: true})
      .then(metaInfo => {
        let boatList = metaInfo.b;
        if (typeof boatList !== 'undefined') {
          if (!Array.isArray(boatList)) {
            boatList = [boatList];
          }
          commit('updateFleetMeta', boatList);
        }
      })
      .catch(err => {
        commit('solapi/logError', {
          apiCall: 'fleetmeta',
          error: err,
        }, {root: true});
      });
    },

    fetchTraces({rootState, state, rootGetters, commit, dispatch}) {
      const getDef = {
        url: "/webclient/traces_" + rootState.auth.raceId + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'content',
        compressedPayload: true,
      };
      if (rootGetters['solapi/isLocked']('traces')) {
        return;
      }
      commit('solapi/lock', 'traces', {root: true});

      dispatch('solapi/get', getDef, {root: true})
      .then(traces => {
        const now = rootGetters['time/now']();
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
          const traceRaw = boat.data.split(/ /);
          for (let i = traceRaw.length - 1; i >= 0; i--) {
            const lngLatTxt = traceRaw[i];
            const lngLatArr = lngLatTxt.split(/,/);
            let latLng = L.latLng(lngLatArr[1], lngLatArr[0]);
            latLng = rootGetters['race/latLngToRaceBounds'](latLng);
            trace.push(latLng);
          }

          commit('updateBoatTrace', {
            id: id,
            time: now,
            trace: trace,
          });
        }
      })
      .catch(err => {
        commit('solapi/logError', {
          apiCall: 'traces',
          error: err,
        }, {root: true});
      })
      .finally(() => {
        commit('solapi/unlock', 'traces', {root: true});
      });
    },
  },
}
