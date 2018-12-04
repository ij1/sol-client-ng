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
    get ({state, commit, dispatch}, reqDef) {
      let retry = true;
      let respType = 'text';
      if (typeof reqDef.compressedPayload !== 'undefined') {
        respType = 'arraybuffer';
      }

      /* Due to dev CORS reasons, we need to mangle some API provided URLs */
      const url = reqDef.url.replace(/^http:\/\/sailonline.org\//, '/');

      axios.get(state.server + url, {
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
          let input = new Uint8Array(data);
          return Buffer.from(pako.inflate(input)).toString();
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

    post ({state, commit}, reqDef) {
      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
      axios.post(state.server + reqDef.url,
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
