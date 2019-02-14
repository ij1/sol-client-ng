import queryString from 'querystring';
import axios from 'axios';
import promisify from 'util.promisify';
import pako from 'pako';
import xml2js from 'xml2js' ;

const parseString = promisify(xml2js.parseString);

export default {
  namespaced: true,

  state: {
    // eslint-disable-next-line
    server: process.env.VUE_APP_API_URL,
    activeApiCalls: new Set(),
    activeApiCallsStamp: 0,	/* Set is not reactive, dummy dep this */
    errorLog: [],
  },

  mutations: {
    lock(state, apiCall) {
      state.activeApiCalls.add(apiCall);
      state.activeApiCallsStamp++;
    },
    unlock(state, apiCall) {
      state.activeApiCalls.delete(apiCall);
      state.activeApiCallsStamp++;
    },
    logError (state, error) {
      state.errorLog.push(error);
    },
  },
  getters: {
    isLocked: (state) => (apiCall) => {
      return state.activeApiCalls.has(apiCall);
    },
  },

  actions: {
    get ({state}, reqDef) {
      let respType = 'text';
      if (typeof reqDef.compressedPayload !== 'undefined') {
        respType = 'arraybuffer';
      }

      /* Due to dev CORS reasons, we need to mangle some API provided URLs */
      const url = reqDef.url.replace(/^http:\/\/sailonline.org\//, '/');

      let p = axios.get(state.server + url, {
        responseType: respType,
        params: reqDef.params,
      })

      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new Error("Invalid API call"));
        }
        return response.data;
      });

      if (typeof reqDef.compressedPayload !== 'undefined') {
        p = p.then((data) => {
          let input = new Uint8Array(data);
          return Buffer.from(pako.inflate(input)).toString();
        });
      }

      p = p.then((data) => {
        return parseString(data, {explicitArray: reqDef.useArrays});
      })

      .then((result) => {
        if (!(result.hasOwnProperty(reqDef.dataField))) {
          return Promise.reject(new Error("No data from API"));
        }

        return result[reqDef.dataField];
      });

      return p;
    },

    post ({state, commit}, reqDef) {
      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      return axios.post(state.server + reqDef.url,
                        queryString.stringify(reqDef.params), config)
        .then((response) => {
          if (response.status !== 200) {
            return Promise.reject(new Error("Invalid API call"));
          } else if (response.data === 'OK') {
            Promise.resolve();
          } else if (typeof reqDef.dataField !== 'undefined') {
            parseString(response.data,
                        {explicitArray: reqDef.useArrays},
                        (err, result) => {

              if (!(result.hasOwnProperty(reqDef.dataField))) {
                return Promise.reject(new Error("No data from API"));
              }

              const data = result[reqDef.dataField];
              return data;
            });
          }
        })
        .catch((err) => {
          console.log(err);
          commit('logError', {
            url: reqDef.url,
            error: err,
          });
          throw err;
        });
    },
  },
}
