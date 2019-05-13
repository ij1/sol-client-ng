import L from 'leaflet';
import raceMessageModule from './racemessages.js';
import fleetModule from './fleet.js';
import { solapiRetryDispatch } from '../../lib/solapi.js';
import { degToRad, radToDeg, minToMsec, hToMsec, UTCToMsec, msecToUTCString } from '../../lib/utils.js';
import { minTurnAngle, atan2Bearing } from '../../lib/nav.js';
import { PROJECTION} from '../../lib/sol.js';

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
      state.finish = raceInfo.course.finish;
      delete raceInfo.course;
      state.info = raceInfo;
      state.loaded = true;
      state.loadTime = raceInfo.loadTime;
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
        finish: [],
      };

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

        /* Calculate bearing from prev WP to this WP ... */
        if (i > 0) {
          const prevwp = PROJECTION.project(course.route[i - 1].latLng);
          const thiswp = PROJECTION.project(waypoint.latLng);
          const bearing = atan2Bearing(thiswp.x - prevwp.x, -(thiswp.y - prevwp.y));
          course.route[i - 1].nextWpBearing = bearing;

          /* ...and which side to pass the prev WP */
          if (i > 1) {
            const turn = minTurnAngle(course.route[i - 2].nextWpBearing,
                                      bearing);
            course.route[i - 1].side = (turn < 0 ? "Port" : "Starboard");
          }
        }
        course.route[idx] = waypoint;
        idx++;
      }

      /* Finish line endpoint calculations */
      const angularDist = degToRad(parseFloat(raceInfo.course.goal_radius) / 60);
      const center = course.route[course.route.length - 1].latLng;
      const centerProj = PROJECTION.project(center);
      for (let i = 0; i <= 1; i++) {
        const angle = course.route[course.route.length - 2].nextWpBearing +
                             Math.PI / 2 + i * Math.PI;
        const dlat = Math.asin(Math.sin(angle - Math.PI / 2) * Math.sin(angularDist));
        const epLat = center.lat + radToDeg(dlat);
        const dy = PROJECTION.project(L.latLng(epLat, center.lng)).y - centerProj.y;
        const dx = Math.tan(angle) * dy;
        const endpoint = PROJECTION.unproject(L.point(centerProj.x + dx, centerProj.y + dy));
        course.finish.push(endpoint);
      }

      return course;
    },
    compareRaceInfo: (state) => (dispatch, raceInfo) => {
      let changed = false;
      if (state.startTime !== raceInfo.startTime) {
        dispatch('notifications/add', {
          text: 'Start time changed from ' +
                msecToUTCString(state.startTime) + ' UTC to ' +
                msecToUTCString(raceInfo.startTime) + ' UTC',
        }, {root: true});
        changed = true;
      }
      let sameCourse = true;
      if (state.route.length !== raceInfo.course.route) {
        sameCourse = false;
      } else {
        for (let i = 0; i < raceInfo.course.route.length; i++) {
          const oldWp = state.route[i];
          const newWp = raceInfo.course.route[i];
          if (!oldWp.latLng.equalsTo(newWp.latLng) ||
              (oldWp.side !== newWp.side)) {
            sameCourse = false;
            break;
          }
        }
      }
      if (!state.finish[0].equalsTo(raceInfo.course.finish[0]) ||
          !state.finish[1].equalsTo(raceInfo.course.finish[1])) {
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
    fetchRaceinfo ({state, rootState, getters, rootGetters, commit, dispatch}) {
      /* Initialize time before boat/wx is fetched to avoid issues */
      const now = rootGetters['time/now']();

      const getDef = {
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

      dispatch('solapi/get', getDef, {root: true})
      .then(raceInfo => {
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

        if (!loaded) {
          commit('boat/setType', boatType, {root: true});
          commit('chatrooms/init', chatroomsData, {root: true});
          commit('boat/polar/set', polarRawData, {root: true});
        } else {
          changed = getters['compareRaceInfo'](dispatch, raceInfo);
        }
        if (changed) {
          commit('init', raceInfo);
        }

        dispatch('weather/parseUpdateTimes', raceInfo.description, {root: true});
        /* Start race API fetching */
        if (!loaded) {
          dispatch('boat/fetch', null, {root: true});
          dispatch('boat/steering/fetchDCs', null, {root: true});
          dispatch('weather/fetchInfo', null, {root: true});
        }
      })
      .catch(err => {
        commit('solapi/logError', {
          apiCall: 'raceinfo',
          error: err,
        }, {root: true});
        solapiRetryDispatch(dispatch, 'fetchRaceinfo');
      })
      .finally(() => {
        commit('solapi/unlock', 'raceinfo', {root: true});
      });
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
