import Vue from 'vue';
import L from 'leaflet';
import rbush from 'rbush';
import { minToMsec, secToMsec } from '../../lib/utils.js';
import { gcCalc } from '../../lib/nav.js';
import { PROJECTION, EARTH_R } from '../../lib/sol.js';

function addToName2id (state, name, id) {
  if (state.name2id.has(name)) {
    let arr = state.name2id.get(name);
    arr.push(id);
    arr.sort((a, b) => {
      return state.id2idx[a].ranking - state.id2idx[b].ranking;
    });
    /* Not strictly needed now (only in-place array operations above),
     * but may be necessary once Vue3 makes Maps reactive
     */
    state.name2id.set(name, arr);
  } else {
    state.name2id.set(name, [id]);
  }
  state.name2idStamp++;
}

/* Besides sorting, this filters duplicates from the list */
function sortedIdList (boatIdsObj, getters) {
  return boatIdsObj.sort((a, b) => {
    const boatA = getters.boatFromId(a);
    const boatB = getters.boatFromId(b);
    const aa = boatA.ranking;
    const bb = boatB.ranking;
    const diff = aa - bb;
    if (diff !== 0) {
      return diff;
    }
    return boatA.id - boatB.id;
  }).filter(function(item, idx, arr) {
    return (idx === arr.length - 1) || (arr[idx + 1] !== item);
  });
}

export default {
  namespaced: true,

  state: {
    flaglessBoats: 0,        /* Fetch metainfo until all boats have country */
    fleetTime: 0,
    fleetFetchInterval: secToMsec(55),
    tracesTime: 0,
    tracesFetchInterval: minToMsec(3),
    boat: [],
    id2idx: {},
    name2id: new Map(),      /* Maps are not reactice! */
    name2idStamp: 0,         /* works aournd lack of reactivity */
    leader: null,
    boatTypes: new Set(),    /* Sets are not reactive! */
    boatTypesCount: 0,       /* works around lack of reactivity */
    selected: {},
    hover: {},
    maxSelectedBoats: 5,
    maxHoverBoats: 3,
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
        distance: 0,

        latLng: boatData.latLng,
        wrappedLatLng: boatData.wrappedLatLng,
        buddy: false,
        syc: null,
        country: null,
        trace: [boatData.wrappedLatLng],
      });
      state.flaglessBoats++;
      addToName2id(state, boatData.name, boatData.id);
    },
    updateFleet (state, update) {
      state.fleetTime = update.timestamp;

      for (let boat of update.fleet) {
        const id = boat.id;

        if (typeof state.id2idx[id] !== 'undefined') {
          const idx = state.id2idx[id];
          if (state.boat[idx].name !== boat.name) {
            state.boat[idx].name = boat.name;
            addToName2id(state, boat.name, id);
            state.boat[idx].buddy = boat.buddy;
          }

          state.boat[idx].latLng = boat.latLng;
          /* Store position to trace if moved. */
          if (!state.boat[idx].wrappedLatLng.equals(boat.wrappedLatLng)) {
            // ADDME: if cog changed a lot, calculate an intersection too?
            // FIXME: What if traces API fails, this could grow very large.
            // ADDME: constant cog reduction logic, the prev one was flawed
            state.boat[idx].trace.push(boat.wrappedLatLng);
          }
          state.boat[idx].cog = boat.cog;
          state.boat[idx].ranking = boat.ranking;
          state.boat[idx].dtg = boat.dtg;
          state.boat[idx].dbl = boat.dbl;
          state.boat[idx].log = boat.log;
          state.boat[idx].distance = boat.distance;
          state.boat[idx].lastRoundedMark = boat.lastRoundedMark;
          state.boat[idx].color = boat.color;

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
            distance: boat.distance,
            lastRoundedMark: boat.lastRoundedMark,
            log: boat.log,
            buddy: boat.buddy,
            syc: false,
            country: null,
            trace: [boat.wrappedLatLng],
          });

          state.flaglessBoats++;

          addToName2id(state, boat.name, id);
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

          state.boat[idx].syc = (boat.$.syc === 'True');
          if ((typeof boat.$.c !== 'undefined') && (boat.$.c.length === 2)) {
            if (state.boat[idx].country === null) {
              state.flaglessBoats--;
            }
            state.boat[idx].country = boat.$.c;
          }
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
    boatFromName: (state) => (name) => {
      const id = state.name2id.get(name);
      if (typeof id !== 'undefined') {
        const idx = state.id2idx[id];
        return state.boat[idx];
      } else {
        return null;
      }
    },
    /* Does not use state, just to use common code for boat colors */
    boatColor: (state, getters, rootState) => (boat) => {
      if ((boat.id === state.boat[state.playerBoatIdx].id) &&
          (rootState.map.cfg.ownBoatColor.value === 'magenta')) {
        return '#ff00ff';
      }
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
    },

    selectedSorted: (state, getters) => {
      return sortedIdList(Object.keys(state.selected), getters);
    },
    hoverSorted: (state, getters) => {
      return sortedIdList(Object.keys(state.hover), getters);
    },
    showIds: (state, getters) => {
      let selected = getters.selectedSorted.slice(0, state.maxSelectedBoats);
      let hover = getters.hoverSorted.slice(0 , state.maxHoverBoats);
      return sortedIdList(selected.concat(hover), getters);
    },
    combinedIds: (state, getters) => {
      return sortedIdList(getters.selectedSorted.concat(getters.hoverSorted),
                          getters);
    },
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
            boat.buddy = (boat.name.charAt(0) === '@');

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
            if (boat.buddy) {
              boat.color = { r: 255, g: 204, b: 0 };
            } else if (boat.ranking === 1) {
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

          /*
           * Right after registering, own boat might not be included into
           * the most recent fleet update just yet by the server...
           */
          let myBoatLatLng;
          if (myBoatNew === null) {
            /* ...Thus, use the starting point as the alternative. */
            myBoatLatLng = rootState.race.route[0].latLng;
          } else {
            myBoatLatLng = myBoatNew.latLng;
          }
          for (let boat of boatList) {
            boat.distance = gcCalc(myBoatLatLng, boat.latLng).distance *
                              EARTH_R / 1852;
          }

          commit('updateFleet', {
            timestamp: now,
            fleet: boatList,
            leaderId: leaderId,
            boatTypes: boatTypes,
            searchData: searchData,
          });
          commit('chatrooms/mapBoatIds', state.name2id, {root: true});

          if (state.flaglessBoats > 0) {
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
