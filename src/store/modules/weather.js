import L from 'leaflet'

export default {
  namespaced: true,

  state: {
    loaded: false,
    data: {
      updated: null,
      boundary: [],
      timeIdx: [],
      increment: [],
      windMap: [],
    },
  },

  mutations: {
    update(state, weatherData) {
      state.data = weatherData;
      state.loaded = true;
    }
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

          let timeIdx = [];
          let windMap = [];
          /* FIXME: It takes quite long time to parse&mangle the arrays here,
           * perhaps use promises for this but then also xml2js parsing will
           * consume lots of time.
           */
          for (let frame of weatherData.frames.frame) {
            // ADDME: parse to UTC seconds, needs a generic helper
            timeIdx.push(frame.$.target_time)

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
            timeIdx: timeIdx,
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
