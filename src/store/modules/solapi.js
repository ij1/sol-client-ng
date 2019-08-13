import Vue from 'vue';
import queryString from 'querystring';
import promisify from 'util.promisify';
import pako from 'pako';
import xml2js from 'xml2js';
import { SolapiError } from '../../lib/solapi.js';

const parseString = promisify(xml2js.parseString);

export default {
  namespaced: true,

  state: {
    // eslint-disable-next-line
    serverPrefix: process.env.VUE_APP_API_URL,
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
    logError (state, errorInfo) {
      if (typeof state.errorLog[errorInfo.apiCall] === 'undefined') {
        Vue.set(state.errorLog, errorInfo.apiCall, []);
      }
      state.errorLog[errorInfo.apiCall].push(errorInfo.error);
      if (!(errorInfo.error instanceof SolapiError)) {
        console.log(errorInfo.error.message);
        console.log(errorInfo.error.stack);
      }
    },
  },
  getters: {
    isLocked: (state) => (apiCall) => {
      return state.activeApiCalls.has(apiCall);
    },
    isProductionServer: (state) => {
      return state.serverPrefix === 'http://www.sailonline.org';
    },
  },

  actions: {
    get ({state}, reqDef) {
      /* Due to dev CORS reasons, we need to mangle some API provided URLs */
      let url = reqDef.url.replace(/^http:\/\/sailonline.org\//, '/');
      const params = queryString.stringify(reqDef.params);
      if (params.length > 0) {
        url += '?' + params;
      }

      let p = fetch(state.serverPrefix + url)
      .catch(err => {
        return Promise.reject(new SolapiError('network', err.message));
      })

      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new SolapiError('statuscode', "Invalid API call"));
        }
        if (typeof reqDef.compressedPayload !== 'undefined') {
          return response.arrayBuffer();
        }
        return response.text();
      });

      if (typeof reqDef.compressedPayload !== 'undefined') {
        p = p.then((data) => {
          return Buffer.from(pako.inflate(data)).toString();
        })
        .catch(err => {
          if (err instanceof SolapiError) {
            return Promise.reject(err);
          } else {
            return Promise.reject(new SolapiError('parsing', err.message));
          }
        });
      }

      p = p.then((data) => {
        return parseString(data, {explicitArray: reqDef.useArrays});
      })
      .catch(err => {
        if (err instanceof SolapiError) {
          return Promise.reject(err);
        } else {
          return Promise.reject(new SolapiError('parsing', err.message));
        }
      })

      .then((result) => {
        if (!(result.hasOwnProperty(reqDef.dataField))) {
          return Promise.reject(new SolapiError('response', "Response missing datafield: " + reqDef.dataField));
        }

        return result[reqDef.dataField];
      });

      return p;
    },

    post ({state, commit}, reqDef) {
      let p = fetch(state.serverPrefix + reqDef.url, {
        method: "POST",
        body: queryString.stringify(reqDef.params),
      })
      .catch(err => {
        return Promise.reject(new SolapiError('network', err.message));
      })
      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new SolapiError('statuscode', "Invalid API call"));
        }
        return response.text();
      })
      .then(data => {
        if (data === 'OK') {
          Promise.resolve();
        } else if (typeof reqDef.dataField !== 'undefined') {
          parseString(data,
                      {explicitArray: reqDef.useArrays},
                      (err, result) => {

            if (!(result.hasOwnProperty(reqDef.dataField))) {
              return Promise.reject(new SolapiError('response', "Response missing datafield: " + reqDef.dataField));
            }

            const data = result[reqDef.dataField];
            return data;
          });
        }
      })
      .catch(err => {
        commit('logError', {
          apiCall: 'POSTgeneric',
          error: err,
        });
        throw err;
      });

      return p;
    },
  },
}
