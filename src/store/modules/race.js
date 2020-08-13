import L from 'leaflet';
import rbush from 'rbush';
import raceMessageModule from './racemessages.js';
import fleetModule from './fleet.js';
import { solapiRetryDispatch, SolapiError } from '../../lib/solapi.js';
import { degToRad, minToMsec, hToMsec, UTCToMsec, msecToUTCString } from '../../lib/utils.js';
import { minTurnAngle, loxoCalc } from '../../lib/nav.js';

export default {
  namespaced: true,
  modules: {
    messages: raceMessageModule,
    fleet: fleetModule,
  },

  state: {
    loaded: false,
    loadTime: 0,
    info: {},
    boundary: [],
    route: [],
    finish: [],
  },

  mutations: {
    init (state, raceInfo) {
      state.boundary = raceInfo.course.boundary;
      state.route = raceInfo.course.route;
      state.marks = raceInfo.course.marks;
      state.finish = raceInfo.course.finish;
      delete raceInfo.course;
      state.info = raceInfo;
      state.loaded = true;
      state.loadTime = raceInfo.loadTime;
    },
    updateLoadTime (state, loadTime) {
      state.loadTime = loadTime;
    },
    updateMessage (state, msg) {
      state.info.message = msg;
    },
  },

  getters: {
    latLngToRaceBounds: (state) => (latLng) => {
      return (latLng.lng < state.boundary[0].lng) ?
             L.latLng(latLng.lat, latLng.lng + 360) :
             latLng;
    },
    parseCourse: () => (raceInfo) => {
      let course = {
        boundary: [
          L.latLng(raceInfo.minlat, raceInfo.minlon),
          L.latLng(raceInfo.maxlat, raceInfo.maxlon)
        ],
        route: [],
        marks: rbush(9, ['.lng', '.lat', '.lng', '.lat']),
        finish: [],
      };
      let searchData = [];

      raceInfo.course.waypoint.sort((a, b) => {
        const aa = parseInt(a.order);
        const bb = parseInt(b.order);
        return aa - bb;
      });
      let idx = 0;
      for (let i = 0; i < raceInfo.course.waypoint.length; i++) {
        let waypoint = raceInfo.course.waypoint[i];
        waypoint.lat = parseFloat(waypoint.lat);
        waypoint.lon = parseFloat(waypoint.lon);
        if (waypoint.lon < parseFloat(raceInfo.minlon)) {
          waypoint.lon += 360;
        }
        waypoint.latLng = L.latLng(waypoint.lat, waypoint.lon);
        waypoint.nextWpBearing = null;
        waypoint.side = null;
        waypoint.arc = {};
        waypoint.duplicate = [];

        /* Calculate bearing from prev WP to this WP ... */
        if (i > 0) {
          const bearing = loxoCalc(course.route[i - 1].latLng,
                                   waypoint.latLng).startBearing;
          course.route[i - 1].nextWpBearing = bearing;

          /* ...and which side to pass the prev WP */
          if (i > 1) {
            let prevAngle = course.route[i - 2].nextWpBearing;
            const turn = minTurnAngle(prevAngle, bearing);
            course.route[i - 1].side = (turn < 0 ? "Port" : "Starboard");

            /* Bisecting line and arc from prev to next angles */
            course.route[i - 1].arc = {
              prevAngle: prevAngle,
              nextAngle: bearing,
              turnAngle: bearing - prevAngle,
            };
            let arc = course.route[i - 1].arc;

            if (turn < 0) {
              arc.prevAngle += Math.PI / 2;
              arc.nextAngle += Math.PI / 2;
              if (arc.turnAngle > 0) {
                arc.turnAngle -= Math.PI * 2;
              }
            } else {
              arc.prevAngle -= Math.PI / 2;
              arc.nextAngle -= Math.PI / 2;
              if (arc.turnAngle < 0) {
                arc.turnAngle += Math.PI * 2;
              }
            }
            arc.midAngle = arc.prevAngle + arc.turnAngle / 2;
          }
        }
        course.route[idx] = waypoint;

        let searchItem = {
          lng: waypoint.latLng.lng,
          lat: waypoint.latLng.lat,
          id: idx,
          finish: false,
        };
        Object.freeze(searchItem);
        searchData.push(searchItem);

        idx++;
      }

      /* Finish line endpoint calculations */
      const angularDist = parseFloat(raceInfo.course.goal_radius) / 60;
      const center = course.route[course.route.length - 1].latLng;
      const angle = course.route[course.route.length - 2].nextWpBearing;
      const dlon = angularDist * Math.cos(angle) / Math.cos(degToRad(center.lat));
      const dlat = angularDist * Math.sin(angle);

      for (let i = -1; i <= 1; i += 2) {
        const endpoint = L.latLng(center.lat + dlat * i, center.lng - dlon * i);
        course.finish.push(endpoint);

        let searchItem = {
          lng: endpoint.lng,
          lat: endpoint.lat,
          id: i,
          finish: true,
        };
        Object.freeze(searchItem);
        searchData.push(searchItem);
      }

      course.marks.load(searchData);

      for (let i = 0; i < course.route.length; i++) {
        let mark = course.route[i];
        const needle = {
          minX: mark.latLng.lng,
          minY: mark.latLng.lat,
          maxX: mark.latLng.lng,
          maxY: mark.latLng.lat,
        }
        let res = course.marks.search(needle);
        if (res.length > 1) {
          for (let f of res) {
            if (!f.finish && f.id !== i &&
                mark.latLng.equals(course.route[f.id])) {
              mark.duplicate.push(f.id);
            }
          }
        }
      }

      return course;
    },
    compareRaceInfo: (state) => (dispatch, raceInfo) => {
      let changed = false;
      if (state.info.startTime !== raceInfo.startTime) {
        dispatch('notifications/add', {
          text: 'Start time changed to ' +
                msecToUTCString(raceInfo.startTime) + ' UTC',
        }, {root: true});
        changed = true;
      }
      let sameCourse = true;
      if (state.route.length !== raceInfo.course.route.length) {
        sameCourse = false;
      } else {
        for (let i = 0; i < raceInfo.course.route.length; i++) {
          const oldWp = state.route[i];
          const newWp = raceInfo.course.route[i];
          if (!oldWp.latLng.equals(newWp.latLng) ||
              (oldWp.side !== newWp.side)) {
            sameCourse = false;
            break;
          }
        }
      }
      if (!state.finish[0].equals(raceInfo.course.finish[0]) ||
          !state.finish[1].equals(raceInfo.course.finish[1])) {
        sameCourse = false;
      }
      if (!sameCourse) {
        dispatch('notifications/add', {
          text: 'Race course has changed!',
        }, {root: true});
        changed = true;
      }
      return changed;
    },

    isTimedRace: (state) => {
      return state.info.race_type === 'timed race';
    },

    startPosition: (state) => {
      return state.route[0].latLng;
    },
    nextWaypoint: (state, getters, rootState) => {
      return state.route[rootState.boat.lastRoundedMark+1];
    },

    towbackPeriod: (state) => {
      return {
        start: state.info.startTime - hToMsec(1),
        end: state.info.startTime,
      };
    },
    isPracticePeriod: (state, getters, rootState, rootGetters) => {
      return rootGetters['boat/time'] < getters.towbackPeriod.start;
    },
    isTowbackPeriod: (state, getters, rootState, rootGetters) => {
      const boatTime = rootGetters['boat/time'];
      return (getters.towbackPeriod.start <= boatTime) &&
             (boatTime < getters.towbackPeriod.end);
    },
    isRaceStarted: (state, getters, rootState, rootGetters) => {
      return rootGetters['boat/time'] >= getters.towbackPeriod.end;
    },
    raceBounds: (state) => {
      if (!state.loaded) {
        return null;
      }
      return L.latLngBounds(state.boundary);
    },

    nextTimeToFetch: (state) => {
      if (state.loadTime >= state.info.startTime) {
        return state.loadTime + hToMsec(6);
      }

      let delta = state.info.startTime - state.loadTime;
      /* T-24h cross-over fetch at T-23h58min */
      if ((delta > hToMsec(23)) && (delta - hToMsec(6) < hToMsec(24))) {
        return state.info.startTime - hToMsec(23) - minToMsec(58);
      }
      if (delta > hToMsec(7)) {
        return state.loadTime + hToMsec(6);
      }
      /* T-58min */
      if (delta > minToMsec(58)) {
        return state.info.startTime - minToMsec(58);
      }
      /* 15mins after the start */
      return state.info.startTime + minToMsec(15);
    }
  },

  actions: {
    async fetchRaceinfo ({state, rootState, getters, rootGetters, commit, dispatch}) {
      let getDef = {
        apiCall: 'raceinfo',
      };
      try {
        /* Initialize time before boat/wx is fetched to avoid issues */
        const now = rootGetters['time/now']();

        getDef = {
          apiCall: 'raceinfo',
          url: "/webclient/auth_raceinfo_" + rootState.auth.raceId + ".xml",
          params: {
            token: rootState.auth.token,
          },
          useArrays: false,
          dataField: 'race',
        };
        if (rootGetters['solapi/isLocked']('raceinfo')) {
          return;
        }
        commit('solapi/lock', 'raceinfo', {root: true});
        if (!state.loaded) {
          commit('boat/instruments/initTime', now, {root: true});
          commit('weather/initTime', now, {root: true});
        }

        let raceInfo = await dispatch('solapi/get', getDef, {root: true});
        const loaded = state.loaded;
        const boatType = raceInfo.boat.type;
        const polarRawData = raceInfo.boat.vpp;
        const chatroomsData = raceInfo.chatrooms.chatroom;
        let changed = true;
        delete raceInfo.boat;
        delete raceInfo.chatrooms;

        raceInfo.startTime = UTCToMsec(raceInfo.start_time);
        delete raceInfo.start_time;
        raceInfo.course = getters['parseCourse'](raceInfo);
        raceInfo.loadTime = now;

        if (typeof raceInfo.boaturl === 'undefined') {
          throw new SolapiError('data', 'Missing boat URL!');
        }
        raceInfo.boaturl = raceInfo.boaturl.replace(/boat\.xml/,'boat_2.xml');

        /* Sanity check! Make sure there are at least 2 WPs (start+finish) */
        if (raceInfo.course.route.length < 2) {
          /* Use the previous one if possible and skip any updates */
          if (loaded) {
            return;
          } else {
            /* Cannot continue without a course, force retry */
            throw new SolapiError('data', 'Received an invalid race course!');
          }
        }
        if (!loaded) {
          commit('boat/setType', boatType, {root: true});
          commit('chatrooms/init', chatroomsData, {root: true});
          await dispatch('boat/polar/parse', polarRawData, {root: true});
        } else {
          changed = getters['compareRaceInfo'](dispatch, raceInfo);
        }
        if (changed) {
          commit('init', raceInfo);
        } else {
          commit('updateLoadTime', raceInfo.loadTime);
        }

        await dispatch('weather/parseUpdateTimes', raceInfo.description, {root: true});
        /* Start race API fetching */
        if (!loaded) {
          /* boat API call may trigger race message fetching, the stored
           * shown ID must be loaded first, thus await here.
           */
          await dispatch('messages/loadShownId');
          dispatch('boat/fetch', null, {root: true});
          dispatch('weather/fetchInfo', null, {root: true});
        }
      } catch(err) {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
        solapiRetryDispatch(dispatch, 'fetchRaceinfo');
      } finally {
        commit('solapi/unlock', 'raceinfo', {root: true});
      }
    },
    fetchRaceComponents({state, dispatch, getters, rootGetters}) {
      const now = rootGetters['time/now']();

      if ((getters['fleet/nextTimeToFetch'] <= now) ||
          /*
           * Fetch fleet immediately after the start of the tow-back period
           * to avoid other boats lingering on sea.
           */
          (getters['isTowBackPeriod'] &&
           state.fleet.fleetTime <= getters['towBackPeriod'][0])) {
        dispatch('fleet/fetchRace');
      }
      if (rootGetters['weather/nextTimeToFetch'] <= now) {
        dispatch('weather/fetchInfo', null, {root: true});
      }
      if (getters['nextTimeToFetch'] <= now) {
        dispatch('fetchRaceinfo');
      }
    },
  },
}
