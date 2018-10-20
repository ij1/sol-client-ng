import axios from 'axios'
const util = require('util');
require('util.promisify').shim();

const xml2js = require('xml2js');
const queryString = require('querystring');
import zlib from 'zlib';

const parseString = util.promisify(xml2js.parseString);
const zlibInflate = util.promisify(zlib.inflate);

export default {
  namespaced: true,

  state: {
    apiState: "Inactive",
    errorLog: [],
  },

  mutations: {
    setState (state, apiState) {
      state.apiState = apiState
    },
    logError (state, error) {
      state.errorLog.push(error)
    },
  },

  actions: {
    get ({rootState, commit, dispatch}, reqDef) {
      let retry = true;
      let respType = 'text';
      if (typeof reqDef.compressedPayload !== 'undefined') {
        respType = 'arraybuffer';
      }

      /* Due to dev CORS reasons, we need to mangle some API provided URLs */
      const url = reqDef.url.replace(/^http:\/\/sailonline.org\//, '/');

      axios.get(rootState.config.server + url, {
        responseType: respType,
        params: reqDef.params,
      })

      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new Error("Invalid API call"));
        }
        return response.data;
      })

      .then((data) => {
        if (typeof reqDef.compressedPayload !== 'undefined') {
          var input = new Uint8Array(data);
          return zlibInflate(input, null);
        } else {
          return data;
        }
      })

      .then((data) => {
        return parseString(data, {explicitArray: reqDef.useArrays});
      })

      .then((result) => {
        if (!(result.hasOwnProperty(reqDef.dataField))) {
          return Promise.reject(new Error("No data from API"));
        }
        commit('setState', "Up")
        if (typeof reqDef.interval === 'undefined') {
          retry = false;
        }

        const data = result[reqDef.dataField];
        reqDef.dataHandler(data);
      })

      .catch((err) => {
        console.log(err)
        commit('logError', {
          url: url,
          error: err,
        })
        if (typeof reqDef.failHandler !== 'undefined') {
          retry = false;
          reqDef.failHandler()
        }
      })

      /* Retry if there is error or interval is given in reqDef */
      .finally(() => {
        if (retry) {
          let interval = 10000;
          let action = 'solapi/get';
          if (typeof reqDef.interval !== 'undefined') {
            interval = reqDef.interval;
          }
          if (typeof reqDef.refetchAction !== 'undefined') {
            action = reqDef.refetchAction;
          }
          setTimeout(() => {
            dispatch(action, reqDef, {root: true});
          }, interval);
        }
      })
    },

    post ({rootState, commit}, reqDef) {
      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
      axios.post(rootState.config.server + reqDef.url,
                 queryString.stringify(reqDef.params), config)

      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new Error("Invalid API call"));
        } else if (response.data === 'OK') {
          commit('setState', "Up")
          reqDef.dataHandler(null);
        } else if (typeof reqDef.dataField !== 'undefined') {
          parseString(response.data,
                      {explicitArray: reqDef.useArrays},
                      (err, result) => {

            if (!(result.hasOwnProperty(reqDef.dataField))) {
              return Promise.reject(new Error("No data from API"));
            }

            const data = result[reqDef.dataField];
            reqDef.dataHandler(data);
          })
        }
      })

      .catch((err) => {
        console.log(err)
        commit('logError', {
          url: reqDef.url,
          error: err,
        })
        if (typeof reqDef.failHandler !== 'undefined') {
          reqDef.failHandler()
        }
      })
    },
  },
}
