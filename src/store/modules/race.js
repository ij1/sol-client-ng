import L from 'leaflet';
import raceMessageModule from './racemessages.js';
import fleetModule from './fleet.js';
import { solapiRetryDispatch } from '../../lib/solapi.js';
import { degToRad, radToDeg, hToMsec, UTCToMsec } from '../../lib/utils.js';
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
  },

  actions: {
    fetchAuthRaceinfo ({state, rootState, getters, rootGetters, commit, dispatch}) {
      /* Initialize time before boat/wx is fetched to avoid issues */
      const now = rootGetters['time/now']();
      commit('boat/instruments/initTime', now, {root: true});
      commit('weather/initTime', now, {root: true});

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

      dispatch('solapi/get', getDef, {root: true})
      .then(raceInfo => {
        const boatType = raceInfo.boat.type;
        const polarRawData = raceInfo.boat.vpp;
        const chatroomsData = raceInfo.chatrooms.chatroom;
        delete raceInfo.boat;
        delete raceInfo.chatrooms;

        raceInfo.startTime = UTCToMsec(raceInfo.start_time);
        delete raceInfo.start_time;
        raceInfo.course = getters['parseCourse'](raceInfo);

        if (!state.loaded) {
          commit('boat/setType', boatType, {root: true});
          commit('chatrooms/init', chatroomsData, {root: true});
          commit('boat/polar/set', polarRawData, {root: true});
        }
        commit('init', raceInfo);

        /* Start race API fetching */
        dispatch('boat/fetch', null, {root: true});
        dispatch('boat/steering/fetchDCs', null, {root: true});
        dispatch('weather/parseUpdateTimes', raceInfo.description, {root: true});
        dispatch('weather/fetchInfo', null, {root: true});
      })
      .catch(err => {
        commit('solapi/logError', {
          apiCall: 'raceinfo',
          error: err,
        }, {root: true});
        solapiRetryDispatch(dispatch, 'fetchAuthRaceinfo');
      })
      .finally(() => {
        commit('solapi/unlock', 'raceinfo', {root: true});
      });
    },
    fetchRaceComponents({dispatch, getters, rootGetters}) {
      const now = rootGetters['time/now']();

      if (getters['fleet/nextTimeToFetch'] <= now) {
        dispatch('fleet/fetchRace');
      }
      if (rootGetters['weather/nextTimeToFetch'] <= now) {
        dispatch('weather/fetchInfo', null, {root: true});
      }
    },
  },
}
