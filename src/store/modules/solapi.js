import queryString from 'querystring';
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
      /* Due to dev CORS reasons, we need to mangle some API provided URLs */
      let url = reqDef.url.replace(/^http:\/\/sailonline.org\//, '/');
      const params = queryString.stringify(reqDef.params);
      if (params.length > 0) {
        url += '?' + params;
      }

      let p = fetch(state.server + url)

      .then((response) => {
        if (response.status !== 200) {
          return Promise.reject(new Error("Invalid API call"));
        }
        if (typeof reqDef.compressedPayload !== 'undefined') {
          return response.arrayBuffer();
        }
        return response.text();
      });

      if (typeof reqDef.compressedPayload !== 'undefined') {
        p = p.then((data) => {
          return Buffer.from(pako.inflate(data)).toString();
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
      return fetch(state.server + reqDef.url, {
          method: "POST",
          body: queryString.stringify(reqDef.params),
        })
        .then((response) => {
          if (response.status !== 200) {
            return Promise.reject(new Error("Invalid API call"));
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
