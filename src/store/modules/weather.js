import L from 'leaflet'
import { UTCToMsec, interpolateFactor, linearInterpolate, bsearchLeft } from '../../lib/utils.js'
import { UVToWind } from '../../lib/sol.js'

function wxLinearInterpolate(factor, startData, endData) {
  return [
    linearInterpolate(factor, startData[0], endData[0]),
    linearInterpolate(factor, startData[1], endData[1]),
  ];
}

function wxTimeInterpolate(factor, startData, endData) {
  const fEnd = -2 * Math.pow(factor, 3) + 3 * Math.pow(factor, 2)
  const fStart = 1 - fEnd;

  return [
    fStart * startData[0] + fEnd * endData[0],
    fStart * startData[1] + fEnd * endData[1],
  ];
}

/* Bounds the given time between wx data range, return null if no bound
 * applies
 */
function boundTime(state, time) {
  if (state.loaded) {
    if (time < state.data.timeSeries[0]) {
      return state.data.timeSeries[0];
    } else if (time > state.data.timeSeries[state.data.timeSeries.length - 1]) {
      return state.data.timeSeries[state.data.timeSeries.length - 1];
    }
  }
  return null;
}

export default {
  namespaced: true,

  state: {
    loaded: false,
    time: 0,
    data: {
      updated: null,
      boundary: null,
      timeSeries: [],
      origo: [],
      increment: [],
      windMap: [],      /* format: [time][lon][lat][u,v] */
    },
  },

  mutations: {
    initTime(state, time) {
      state.time = time;
    },
    update(state, weatherData) {
      state.data = weatherData;
      state.loaded = true;
      /* wx begins only after our current timestamp, fix the wx time index
       * to avoid issues
       */
      if (state.time < state.data.timeSeries[0]) {
        console.log("time before wx, fixing: " + state.time + " < " + state.data.timeSeries[0]);
        state.time = state.data.timeSeries[0];
      }
    },
    minTime(state, minTime) {
      if (state.loaded) {
        const boundedMinTime = boundTime(state, minTime);
        if (boundedMinTime !== null) {
          minTime = boundedMinTime;
        }
        if (state.time < minTime) {
          state.time = minTime;
        }
      }
    },
    setTime(state, time) {
      if (state.loaded) {
        const boundedTime = boundTime(state, time);
        if (boundedTime !== null) {
          time = boundedTime;
        }
        state.time = time;
      }
    },
  },

  getters: {
    time: (state) => {
      return state.time;
    },
    lastTimestamp: (state) => {
      return state.data.timeSeries[state.data.timeSeries.length - 1];
    },
    dataTimescale: (state, getters, rootState, rootGetters) => {
      return getters.lastTimestamp - rootGetters['boat/time'];
    },
    timeIndex: (state) => {
      /* Short-circuit for the common case near the beginning of the wx series */
      if (state.time <= state.data.timeSeries[1]) {
        return 0;
      }

      let idx = bsearchLeft(state.data.timeSeries, state.time, 2, state.data.timeSeries.length - 1) - 1;
      /* For now, check that the result is valid, */
      if ((state.data.timeSeries[idx] > state.time) ||
          (state.data.timeSeries[idx+1] < state.time)) {
        console.log("Bug in binary-search: " + state.data.timeSeries[idx] + "<=" + state.time + "<=" + state.data.timeSeries[idx+1] + "?!?");
      }
      return idx;
    },
    timeIndexAny: (state, getters) => (timestamp) => {
      /* Short-circuit for the common case near the beginning of the wx series */
      if (timestamp <= state.data.timeSeries[1]) {
        return 0;
      }

      let min = 2;
      let max = state.data.timeSeries.length - 1;
      if (state.data.timeSeries[getters.timeIndex+1] < timestamp) {
        min = getters.timeIndex + 2;
      } else if (state.data.timeSeries[getters.timeIndex] > timestamp) {
        max = getters.timeIndex;
      }

      let idx = bsearchLeft(state.data.timeSeries, timestamp, min, max) - 1;
      /* For now, check that the result is valid, */
      if ((state.data.timeSeries[idx] > timestamp) ||
          (state.data.timeSeries[idx+1] < timestamp)) {
        console.log("Bug in binary-search: " + state.data.timeSeries[idx] + "<=" + timestamp + "<=" + state.data.timeSeries[idx+1] + "?!?");
      }
      return idx;
    },

    latLngWind: (state, getters) => (latLng, timestamp) => {
      if (state.data.boundary === null) {
        return undefined;
      }
      /* De-wrap if longitude < origo because the wx boundary of the source
       * data is not-wrapped when crossing the anti-meridian
       */
      const wxLatLng = L.latLng(latLng.lat,
                                latLng.lng +
                                (latLng.lng < state.data.origo[1] ? 360 : 0));
      /*
       * .contains() doesn't prevent access to undefined item at race boundary
       * so we have to do the checks manually. Lng is linearized above, thus
       * only >= check is needed for it.
       */
      if ((wxLatLng.lng >= state.data.boundary.getNorthEast().lng) ||
          (wxLatLng.lat < state.data.boundary.getSouthWest().lat) ||
          (wxLatLng.lat >= state.data.boundary.getNorthEast().lat)) {
        return undefined;
      }

      const lonIdx = Math.floor((wxLatLng.lng - state.data.origo[1]) / state.data.increment[1]);
      const latIdx = Math.floor((wxLatLng.lat - state.data.origo[0]) / state.data.increment[0]);
      let timeIdx = getters.timeIndex;
      let timeVal = state.time;

      if (typeof timestamp !== 'undefined') {
        timeVal = timestamp;
        timeIdx = getters['timeIndexAny'](timestamp);
      }

      /* latitude (y) solution */
      let firstRes = [[], []];
      const firstFactor = interpolateFactor(
        latIdx * state.data.increment[0] + state.data.origo[0],
        wxLatLng.lat,
        (latIdx + 1) * state.data.increment[0] + state.data.origo[0]
      );
      for (let t = 0; t <= 1; t++) {
        for (let x = 0; x <= 1; x++) {
          firstRes[t][x] = wxLinearInterpolate(
            firstFactor,
            state.data.windMap[timeIdx+t][lonIdx+x][latIdx],
            state.data.windMap[timeIdx+t][lonIdx+x][latIdx+1]
          );
        }
      }

      /* longitude (x) solution */
      let secondRes = [];
      const secondFactor = interpolateFactor(
        lonIdx * state.data.increment[1] + state.data.origo[1],
        wxLatLng.lng,
        (lonIdx + 1) * state.data.increment[1] + state.data.origo[1]
      );
      for (let t = 0; t <= 1; t++) {
          secondRes[t] = wxLinearInterpolate(
            secondFactor,
            firstRes[t][0],
            firstRes[t][1]
          );
      }

      /* time (z) solution */
      const thirdFactor = interpolateFactor(
        state.data.timeSeries[timeIdx],
        timeVal,
        state.data.timeSeries[timeIdx+1],
      );
      return UVToWind(wxTimeInterpolate(
        thirdFactor,
        secondRes[0],
        secondRes[1]
      ));
    },
  },

  actions: {
    // ADDME: when to fetch the next wx, add the support in a concurrency
    // safe way to avoid multiple overlapping weather fetches.
    fetchInfo ({rootState, dispatch}) {
      const getDef = {
        url: rootState.race.info.weatherurl,
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'weatherinfo',

        dataHandler: (weatherInfo) => {
          let dataUrl = weatherInfo.url;
          dispatch('fetchData', dataUrl);
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },

    fetchData ({rootState, commit, dispatch}, dataUrl) {
      const getDef = {
        url: dataUrl,
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'weathersystem',

        dataHandler: (weatherData) => {
          let boundary = L.latLngBounds(
            L.latLng(weatherData.$.lat_min, weatherData.$.lon_min),
            L.latLng(weatherData.$.lat_max, weatherData.$.lon_max));

          const updated = UTCToMsec(weatherData.$.last_updated);
          if (updated === null) {
            console.log("Invalid date in weather data!");
            return;
          }

          let timeSeries = [];
          let windMap = [];
          /* FIXME: It takes quite long time to parse&mangle the arrays here,
           * perhaps use vue-worker for this but then also xml2js parsing will
           * consume lots of time. My initial attempt failed on lacking
           * this.$worker for solapi side so the JS syntax needs to solved
           * for this conversion to take place.
           */
          for (let frame of weatherData.frames.frame) {
            const utc = UTCToMsec(frame.$.target_time);
            if (utc === null) {
              console.log("Invalid date in weather data!");
              return;
            }
            timeSeries.push(utc);

            let u = frame.U.trim().split(/;\s*/);
            let v = frame.V.trim().split(/;\s*/);
            if (u.length !== v.length) {
              console.log("Inconsistent weather data!");
              return;
            }

            let windFrame = [];
            for (let i = 0; i < u.length-1; i++) {
              if (u[i] === '') {
                break;
              }

              let uu = u[i].trim().split(/\s+/);
              let vv = v[i].trim().split(/\s+/);

              if (uu.length !== vv.length) {
                console.log("Inconsistent weather data!");
                return;
              }

              /* Construct last-level [u, v] arrays */
              let windRow = [];
              for (let j = 0; j < uu.length; j++) {
                let tmp = [parseFloat(uu[j]), parseFloat(vv[j])];
                windRow.push(Object.freeze(tmp));
              }
              windFrame.push(Object.freeze(windRow));
            }
            windMap.push(Object.freeze(windFrame));
          }
          windMap = Object.freeze(windMap);

          let origo = [parseFloat(weatherData.$.lat_min),
                          parseFloat(weatherData.$.lon_min)];
          let increment = [parseFloat(weatherData.$.lat_increment),
                             parseFloat(weatherData.$.lon_increment)];

          /* Improve performance by freezing all interpolation related
           * array objects. This avoid adding unnecessary reactivity detectors.
           */
          timeSeries = Object.freeze(timeSeries);
          origo = Object.freeze(origo);
          increment = Object.freeze(increment);
          boundary = Object.freeze(boundary);

          let weatherInfo = {
            updated: updated,
            boundary: boundary,
            timeSeries: timeSeries,
            origo: origo,
            increment: increment,
            windMap: windMap,
          };
          commit('update', weatherInfo);
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
