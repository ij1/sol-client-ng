import L from 'leaflet'
import { UTCToMsec } from '../../lib/utils.js'

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
    time: Date.now(),
    data: {
      updated: null,
      boundary: [],
      timeSeries: [],
      increment: [],
      windMap: [],
    },
  },

  mutations: {
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
    timeIndex: (state) => (time) => {
      /* Short-circuit for the common case near the beginning of the wx series */
      if (time <= state.timeSeries[1]) {
        return 0;
      }
      let mid = state.lastTimeIndex;
      let min = 0;
      let max = state.timeSeries.length - 2;
      while (max - min > 1) {
        if (time < state.timeSeries[mid]) {
          max = mid;
        } else {
          min = mid;
        }
        mid = (max + min) / 2;
      }
      return min;
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
          let dataUrl = weatherInfo['url'];
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
          const boundary = [L.latLng(weatherData.$.lat_min, weatherData.$.lon_min),
                            L.latLng(weatherData.$.lat_max, weatherData.$.lon_max)];

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

          let weatherInfo = {
            updated: weatherData.last_updated,
            boundary: boundary,
            timeSeries: timeSeries,
            increment: [weatherData.$.lat_increment, weatherData.$.lon_increment],
            windMap: windMap,
          };
          commit('update', weatherInfo);
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
