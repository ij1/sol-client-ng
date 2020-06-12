import Vue from 'vue';
import L from 'leaflet';
import rbush from 'rbush';
import { minToMsec, secToMsec, radToDeg } from '../../lib/utils.js';
import { gcCalc, loxoCalc, minTurnAngle } from '../../lib/nav.js';
import { PROJECTION, EARTH_R, solBoatPolicy, PR_MARK_BOAT, DARK_SEA_BLUE } from '../../lib/sol.js';
import { __latLngInDark, sunEquatorialPosition, GMST, julian } from '../../lib/sun.js';

const nearDistance = 0.0001 * 1852 / EARTH_R;
const colorCorrectionLimitWhite = 128;
const colorCorrectionLimitDark = 160;

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

function addToSearchData(searchData, boatId, boatName, latLng, commandBoat, rootGetters) {
  if (!solBoatPolicy(boatName, rootGetters)) {
    return;
  }

  for (let ddeg = -360; ddeg <= 360; ddeg += 360) {
    let searchItem = {
      lng: latLng.lng + ddeg,
      lat: latLng.lat,
      id: boatId,
      commandBoat: commandBoat,
    };
    Object.freeze(searchItem);
    searchData.push(searchItem);
  }
}

export default {
  namespaced: true,

  state: {
    flaglessBoats: 0,        /* Fetch metainfo until all boats have country */
    fleetTime: 0,
    fleetFetchInterval: secToMsec(55),
    metadataTime: 0,
    metadataFetchInterval: minToMsec(10),
    tracesTime: 0,
    tracesFetchInterval: minToMsec(3),
    towbackResetDone: false,
    boat: [],
    id2idx: {},
    name2id: new Map(),      /* Maps are not reactice! */
    name2idStamp: 0,         /* works aournd lack of reactivity */
    leader: null,
    boatTypes: new Set(),    /* Sets are not reactive! */
    boatTypesCount: 0,       /* works around lack of reactivity */
    selected: {},
    hover: {},
    maxSelectedBoats: 10,
    maxHoverBoats: 3,
    searchTree: rbush(9, ['.lng', '.lat', '.lng', '.lat']),
    searchTreeStamp: 0,
    commandBoatItems: [],
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
        practiceMark: boatData.name.startsWith(PR_MARK_BOAT),
        navLights: false,

        syc: null,
        country: null,
        trace: [],
        lastMile: [boatData.wrappedLatLng],
        traceContinue: false,
      });
      state.flaglessBoats++;
      addToName2id(state, boatData.name, boatData.id);
    },
    updateFleet (state, update) {
      for (let boat of update.fleet) {
        const id = boat.id;

        if (typeof state.id2idx[id] !== 'undefined') {
          const idx = state.id2idx[id];
          let toBoat = state.boat[idx];

          if (toBoat.name !== boat.name) {
            toBoat.name = boat.name;
            addToName2id(state, boat.name, id);
            toBoat.buddy = boat.buddy;
            toBoat.practiceMark = boat.practiceMark;
          }

          toBoat.latLng = boat.latLng;
          /* Store position to trace if moved. */
          if (idx !== state.playerBoatIdx) {
            if (!toBoat.wrappedLatLng.equals(boat.wrappedLatLng)) {
              // ADDME: if cog changed a lot, calculate an intersection too?
              const sameCog = Math.abs(radToDeg(minTurnAngle(toBoat.cog,
                                                             boat.cog))) < 0.2;
              if (sameCog && toBoat.traceContinue) {
                Vue.set(toBoat.lastMile, toBoat.lastMile.length - 1,
                        boat.wrappedLatLng);
              } else {
                /* Prevent very large array if traces API fails for some reason */
                const maxLen = 20;
                if (toBoat.lastMile.length > maxLen) {
                  toBoat.lastMile.splice(1, toBoat.lastMile.length - maxLen);
                }

                toBoat.lastMile.push(boat.wrappedLatLng);
                toBoat.traceContinue = sameCog;
              }
              toBoat.wrappedLatLng = boat.wrappedLatLng;
            }
          } else {
            /* Connect fleet & command boats during init transient */
            if (state.fleetTime === 0 && toBoat.trace.length === 0) {
              if (!toBoat.lastMile[0].equals(boat.wrappedLatLng)) {
                toBoat.lastMile.unshift(boat.wrappedLatLng);
              }
            }
            if (!toBoat.wrappedLatLng.equals(boat.wrappedLatLng)) {
              toBoat.wrappedLatLng = boat.wrappedLatLng;
            }
          }
          toBoat.cog = boat.cog;
          toBoat.ranking = boat.ranking;
          toBoat.dtg = boat.dtg;
          toBoat.dbl = boat.dbl;
          toBoat.log = boat.log;
          toBoat.distance = boat.distance;
          toBoat.lastRoundedMark = boat.lastRoundedMark;
          toBoat.color = boat.color;
          toBoat.navLights = boat.navLights;

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
            practiceMark: boat.practiceMark,
            navLights: boat.navLights,
            syc: false,
            country: null,
            trace: [],
            lastMile: [boat.wrappedLatLng],
            traceContinue: false,
          });

          state.flaglessBoats++;

          addToName2id(state, boat.name, id);
        }
      }

      state.leader = update.leaderId;

      state.searchTree.clear();
      state.searchTree.load(update.searchData);
      state.searchTreeStamp++;
      state.commandBoatItems = [];

      for (let boatType of update.boatTypes) {
        if (!state.boatTypes.has(boatType)) {
          state.boatTypes.add(boatType);
        }
      }
      state.boatTypesCount = state.boatTypes.length;

      state.fleetTime = update.timestamp;
    },
    updateCommandBoat(state, updateData) {
      const ownBoat = state.boat[state.playerBoatIdx];

      if (updateData.oldPosition !== null &&
          !ownBoat.latLng.equals(updateData.oldPosition)) {
        for (let i of state.commandBoatItems) {
          state.searchTree.remove(i);
        }
      }
      state.commandBoatItems = [];
      if (!ownBoat.latLng.equals(updateData.newPosition)) {
        addToSearchData(state.commandBoatItems, ownBoat.id, ownBoat.name,
                        updateData.newPosition, true, updateData.rootGetters);
        state.searchTree.load(state.commandBoatItems);

        if (updateData.move) {
          if (updateData.sameCog && ownBoat.traceContinue) {
            Vue.set(ownBoat.lastMile, ownBoat.lastMile.length - 1,
                    updateData.wrappedNewPosition);
          } else {
            ownBoat.lastMile.push(updateData.wrappedNewPosition);
            ownBoat.traceContinue = updateData.sameCog;
          }
        }
      }
      state.searchTreeStamp++;
    },
    updateFleetMeta (state, metadata) {
      state.metadataTime = metadata.time;
      for (let boat of metadata.meta) {
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
    updateBoatTrace (state, newTrace) {
      const id = newTrace.id;
      if (newTrace.trace.length === 0) {
        return;
      }
      if (typeof state.id2idx[id] !== 'undefined') {
        const idx = state.id2idx[newTrace.id];
        let boat = state.boat[idx];

        if (boat.trace.length === 0 ||
            !boat.trace[boat.trace.length - 1].equals(newTrace.trace[newTrace.trace.length - 1])) {
          let i;
          const newLastPos = newTrace.trace[newTrace.trace.length - 1];
          let keepLastMile = -1;

          for (i = 0; i < boat.lastMile.length - 1; i++) {
            if (boat.lastMile[i].equals(newLastPos)) {
              keepLastMile = i;
              break;
            } else {
              let path = loxoCalc(boat.lastMile[i], boat.lastMile[i + 1]);
              let path2 = loxoCalc(boat.lastMile[i], newLastPos);
              /* Nearly equal node? */
              if (path2.distance < nearDistance) {
                Vue.set(boat.lastMile, i, newLastPos);
                keepLastMile = i;
                break;
              }
              /* On path */
              if (Math.abs(radToDeg(minTurnAngle(path.startBearing, path2.startBearing))) < 6 &&
                  path2.distance < path.distance - nearDistance) {
                Vue.set(boat.lastMile, i, newLastPos);
                keepLastMile = i;
                break;
              }
            }
          }
          boat.trace = newTrace.trace;
          if (keepLastMile >= 0) {
            /* Optimize common case */
            if (keepLastMile > 0) {
              boat.lastMile.splice(0, keepLastMile);
            }
            /* Prevent very large array if traces matching+cutting fails */
            const maxLen = idx === state.playerBoatIdx ? 100 : 20;
            if (boat.lastMile.length > maxLen) {
              boat.lastMile.splice(1, boat.lastMile.length - maxLen);
            }
            if (boat.lastMile.length < 3) {
              boat.traceContinue = false;
            }
          } else {
            const lastMileEnd = boat.lastMile[boat.lastMile.length - 1];

            boat.lastMile = [newLastPos];
            if (!newLastPos.equals(lastMileEnd)) {
              boat.lastMile.push(lastMileEnd);
            }
            boat.traceContinue = false;
          }
        }
      }
    },
    towbackReset(state) {
      for (let boat of state.boat) {
        boat.trace = [];
        boat.lastMile = [boat.lastMile[boat.lastMile.length - 1]];
      }
      state.towbackResetDone = true;
    },
    allTracesUpdated(state, time) {
      state.tracesTime = time;
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
    boatColor: (state, getters, rootState, rootGetters) => (boat) => {
      if ((boat.id === state.boat[state.playerBoatIdx].id) &&
          (rootState.map.cfg.ownBoatColor.value === 'magenta')) {
        return '#ff00ff';
      }
      let r = boat.color.r;
      let g = boat.color.g;
      let b = boat.color.b;
      if (rootGetters['ui/isDark']) {
        const max = Math.max(r, g, b - DARK_SEA_BLUE);
        if (max < colorCorrectionLimitDark) {
          const correctionFactor = colorCorrectionLimitDark / max;
          if (r >= max * 0.6) {
            r = Math.round(r * correctionFactor);
          }
          if (g >= max * 0.6) {
            g = Math.round(g * correctionFactor);
          }
          if (b - DARK_SEA_BLUE >= max * 0.6) {
            b = Math.min(Math.round((b - DARK_SEA_BLUE) * correctionFactor) +
                         DARK_SEA_BLUE, 255);
          }
        }
        if (r + g < colorCorrectionLimitDark) {
          const saturationFactor = colorCorrectionLimitDark / (r + g + 1.0);
          r = Math.round((r + 1) * saturationFactor);
          g = Math.round((g + 1) * saturationFactor);
        }
      } else {
        const min = Math.min(r, g, b);
        if (min > colorCorrectionLimitWhite) {
          const correctionFactor = colorCorrectionLimitWhite / min;
          if (r <= min * 1.4) {
            r = Math.round(r * correctionFactor);
          }
          if (g <= min * 1.4) {
            g = Math.round(g * correctionFactor);
          }
          if (b <= min * 1.4) {
            b = Math.round(b * correctionFactor);
          }
        }
      }
      return 'rgba(' + r + ',' + g + ',' + b + ', 0.8)';
    },

    multiClassRace: (state) => {
      return state.boatTypesCount > 1;
    },

    nextTimeToFetch: (state) => {
      return state.fleetTime + state.fleetFetchInterval;
    },
    nextTimeToFetchMetadata: (state) => {
      return state.metadataTime + state.metadataFetchInterval;
    },
    nextTimeToFetchTraces: (state) => {
      return state.tracesTime + state.tracesFetchInterval;
    },

    selectedFiltered: (state, getters, rootState, rootGetters) => {
      let res = Object.assign({}, state.selected);
      for (const id of Object.keys(state.selected)) {
        const boat = getters.boatFromId(id);
        if (!solBoatPolicy(boat.name, rootGetters) ||
            !rootGetters['ui/boatlists/applyFilterToBoat'](boat)) {
          delete res['' + id];
        }
      }
      return res;
    },

    selectedSorted: (state, getters) => {
      return sortedIdList(Object.keys(getters.selectedFiltered), getters);
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
    async fetchRace({rootState, state, getters, rootGetters, commit, dispatch}) {
      if (rootGetters['isTowBackPeriod'] && !state.towbackResetDone) {
        commit('towbackReset');
      }

      const getDef = {
        apiCall: 'fleet',
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

      try {
        let raceInfo = await dispatch('solapi/get', getDef, {root: true});
        const now = rootGetters['time/now']();
        const julianDay = julian(now);
        const gst = GMST(julianDay);
        const sunPos = sunEquatorialPosition(julianDay);

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

          for (let boat of boatList) {
            boat.latLng = L.latLng(boat.lat, boat.lon);
            boat.wrappedLatLng = rootGetters['race/latLngToRaceBounds'](boat.latLng);

            addToSearchData(searchData, boat.id, boat.name, boat.latLng, false,
                            rootGetters);

            delete boat.lat;
            delete boat.lon;

            boat.cog = parseFloat(boat.cog);
            boat.ranking = parseInt(boat.ranking);
            boat.dtg = parseFloat(boat.dtg);
            boat.dbl = parseFloat(boat.dbl);
            boat.log = parseFloat(boat.log);
            boat.buddy = (boat.name.charAt(0) === '@');
            boat.practiceMark = boat.name.startsWith(PR_MARK_BOAT);
            boat.navLights = __latLngInDark(boat.latLng, gst, sunPos);

            boat.lastRoundedMark = parseInt(boat.current_leg);
            delete boat.current_leg;

            boat.color = {
              r: +boat.color_R,
              g: +boat.color_G,
              b: +boat.color_B,
            }
            delete boat.color_R;
            delete boat.color_G;
            delete boat.color_B;
            if (boat.buddy) {
              boat.color = { r: 255, g: 204, b: 0 };
            } else if (boat.practiceMark) {
              boat.color = { r: 255, g: 0, b: 255 };
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
          if (rootState.boat.position !== null) {
            commit('updateCommandBoat', {
              oldPosition: null,
              newPosition: rootState.boat.position,
              wrappedNewPosition: rootGetters['race/latLngToRaceBounds'](rootState.boat.position),
              move: false,
              rootGetters: rootGetters,
            });
          }
          commit('chatrooms/mapBoatIds', state.name2id, {root: true});

          if ((state.flaglessBoats > 0) ||
              (getters['nextTimeToFetchMetadata'] <= now)) {
            dispatch('fetchMetainfo');
          }
          if (getters['nextTimeToFetchTraces'] <= now) {
            dispatch('fetchTraces');
          }
        }
      } catch(err) {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
      } finally {
        commit('solapi/unlock', 'fleet', {root: true});
      }
    },

    async fetchMetainfo({rootState, rootGetters, commit, dispatch}) {
      const getDef = {
        apiCall: 'fleetmeta',
        url: "/webclient/metainfo_" + rootState.auth.raceId + ".xml",
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'boatinfo',
        compressedPayload: true,
      };
      if (rootGetters['solapi/isLocked']('fleetmetainfo')) {
        return;
      }
      commit('solapi/lock', 'fleetmetainfo', {root: true});

      try {
        let metaInfo = await dispatch('solapi/get', getDef, {root: true});
        const now = rootGetters['time/now']();
        let boatList = metaInfo.b;

        if (typeof boatList !== 'undefined') {
          if (!Array.isArray(boatList)) {
            boatList = [boatList];
          }
          commit('updateFleetMeta', {
            meta: boatList,
            time: now,
          });
        }
      } catch(err) {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
      } finally {
        commit('solapi/unlock', 'fleetmetainfo', {root: true});
      }
    },

    async fetchTraces({rootState, state, rootGetters, commit, dispatch}) {
      const getDef = {
        apiCall: 'traces',
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

      try {
        let traces = await dispatch('solapi/get', getDef, {root: true});
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

          if (trace.length === 0) {
            continue;
          }

          commit('updateBoatTrace', {
            id: id,
            trace: trace,
          });
        }
        const now = rootGetters['time/now']();
        commit('allTracesUpdated', now);
      } catch(err) {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
      } finally {
        commit('solapi/unlock', 'traces', {root: true});
      }
    },
  },
}
