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
      windU: [],
      windV: [],
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
          let windU = [];
          let windV = [];
          for (let frame of weatherData.frames.frame) {
            // ADDME: parse to UTC seconds, needs a generic helper
            timeIdx.push(frame.$.target_time)

            let u = [];
            let v = [];
            for (let entry of frame.U.trim().split(/;\s*/)) {
              u.push(entry.trim().split(/\s+/).map(val => parseFloat(val)));
            }
            for (let entry of frame.V.trim().split(/;\s*/)) {
              v.push(entry.trim().split(/\s+/).map(val => parseFloat(val)));
            }
            windU.push(u);
            windV.push(v);
          }

          let weatherInfo = {
            updated: weatherData.last_updated,
            boundary: boundary,
            timeIdx: timeIdx,
            increment: [weatherData.$.lat_increment, weatherData.$.lon_increment],
            windU: windU,
            windV: windV,
          };
          commit('update', weatherInfo);
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
