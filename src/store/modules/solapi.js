import axios from 'axios'
const parseString = require('xml2js').parseString;

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

      axios.get(rootState.config.server + reqDef.url, {params: reqDef.params})

      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new Error("Invalid API call"));
        }

        parseString(response.data,
                    {explicitArray: reqDef.useArrays},
                    (err, result) => {

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
      })

      .catch((err) => {
        console.log(err)
        commit('logError', {
          url: reqDef.url,
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
  },
}
