import axios from 'axios'
const parseString = require('xml2js').parseString;
const queryString = require('querystring');

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
      /* Due to dev CORS reasons, we need to mangle some API provided URLs */
      const url = reqDef.url.replace(/^http:\/\/sailonline.org\//, '/');

      axios.get(rootState.config.server + url, {params: reqDef.params})

      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new Error("Invalid API call"));
        }
        return Promise.resolve(response.data);
      })

      .then((data) => {
        let err;
        let result;
        parseString(data,
                    {explicitArray: reqDef.useArrays},
                    (_err, _result) => {
          err = _err;
          result = _result;
        })
        if (err) {
          return Promise.reject(new Error("Parsing failed"));
        }
        return Promise.resolve(result);
      })

      .then((res) => {
        let result = res;
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
