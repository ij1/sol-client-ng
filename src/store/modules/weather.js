import L from 'leaflet'
import { UTCToMsec, interpolateFactor, linearInterpolate } from '../../lib/utils.js'
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

      let min = 1;
      let max = state.data.timeSeries.length - 2;
      while (min <= max) {
        const mid = Math.floor((max + min) / 2);
        /* No point in optimizing for the very rare to occur equal case */
        if (state.time >= state.data.timeSeries[mid]) {
          min = mid + 1;
        } else {
          max = mid - 1;
        }
      }
      /* For now, check that the result is valid, */
      if ((state.data.timeSeries[max] > state.time) ||
          (state.data.timeSeries[max+1] < state.time)) {
        console.log("Bug in binary-search: " + state.data.timeSeries[max] + "<=" + state.time + "<=" + state.data.timeSeries[max+1] + "?!?");
      }
      return max;
    },

    latLngWind: (state, getters) => (latLng) => {
      if (state.data.boundary === null) {
        return undefined;
      }
      /* De-wrap if longitude < origo because the wx boundary of the source
       * data is not-wrapped when crossing the anti-meridian
       */
      const wxLatLng = L.latLng(latLng.lat,
                                latLng.lng +
                                (latLng.lng < state.data.origo[1] ? 360 : 0));
      if (!state.data.boundary.contains(wxLatLng)) {
        return undefined;
      }

      const lonIdx = Math.floor((wxLatLng.lng - state.data.origo[1]) / state.data.increment[1]);
      const latIdx = Math.floor((wxLatLng.lat - state.data.origo[0]) / state.data.increment[0]);

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
            state.data.windMap[getters.timeIndex+t][lonIdx+x][latIdx],
            state.data.windMap[getters.timeIndex+t][lonIdx+x][latIdx+1]
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
        state.data.timeSeries[getters.timeIndex],
        state.time,
        state.data.timeSeries[getters.timeIndex+1],
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
          const boundary = L.latLngBounds(
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
                windRow.push([parseFloat(uu[j]), parseFloat(vv[j])]);
              }

              windFrame.push(windRow);
            }
            windMap.push(windFrame);
          }

          let origo = [parseFloat(weatherData.$.lat_min),
                          parseFloat(weatherData.$.lon_min)];
          let increment = [parseFloat(weatherData.$.lat_increment),
                             parseFloat(weatherData.$.lon_increment)];

          /* Improve performance by freezing all interpolation related
           * array objects. This avoid adding unnecessary reactivity detectors.
           */
          windMap = Object.freeze(windMap);
          timeSeries = Object.freeze(timeSeries);
          origo = Object.freeze(origo);
          increment = Object.freeze(increment);

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
