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
    get ({rootState}, getDef) {
      let retry = true;

      axios.get(rootState.config.server + getDef.url, {params: getDef.params})

      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new Error("Invalid API call"));
        }

        parseString(response.data,
                    {explicitArray: getDef.useArrays},
                    (err, result) => {

          if (!(result.hasOwnProperty(getDef.dataField))) {
            return Promise.reject(new Error("No data from API"));
          }
          this.commit('solapi/setState', "Up")
          if (!getDef.hasOwnProperty('interval')) {
            retry = false;
          }

          const data = result[getDef.dataField];
          getDef.dataHandler(data);
        })
      })

      .catch((err) => {
        console.log(err)
        this.commit('solapi/logError', {
          url: getDef.url,
          error: err,
        })
        if (getDef.hasOwnProperty('failHandler')) {
          retry = false;
          getDef.failHandler()
        }
      })

      /* Retry if there is error or interval is given in getDef */
      .finally(() => {
        if (retry) {
          let interval = 10000;
          let action = 'solapi/get';
          if (getDef.hasOwnProperty('interval')) {
            interval = getDef.interval;
          }
          if (getDef.hasOwnProperty('refetchAction')) {
            action = getDef.refetchAction;
          }
          setTimeout(() => {
            this.dispatch(action, getDef, {root: true});
          }, interval);
        }
      })
    },
  },
}
