import Vue from 'vue';
import queryString from 'querystring';
import promisify from 'util.promisify';
import pako from 'pako';
import * as xml2js from 'isomorphic-xml2js';
import { SolapiError } from '../../lib/solapi.js';

const parseString = promisify(xml2js.parseString);

async function __post (state, reqDef) {
  let response;

  try {
    response = await fetch(state.serverPrefix + reqDef.url, {
      method: "POST",
      body: queryString.stringify(reqDef.params),
    });
  } catch(err) {
    throw new SolapiError('network', err.message);
  }

  if (response.status !== 200) {
    throw new SolapiError('statuscode', "Invalid API call");
  }
  let data = response.text();

  if (data === 'OK') {
    return Promise.resolve();
  } else if (typeof reqDef.dataField !== 'undefined') {
    let result = null;
    try {
      result = await parseString(data, {explicitArray: reqDef.useArrays});
    } catch(err) {
      throw new SolapiError('response', err.message);
    }
    if (!(result.hasOwnProperty(reqDef.dataField))) {
      throw new SolapiError('response', "Response missing datafield: " + reqDef.dataField);
    }
    return result[reqDef.dataField];
  }
}

export default {
  namespaced: true,

  state: {
    // eslint-disable-next-line
    serverPrefix: process.env.VUE_APP_API_URL,
    apiLocks: new Set(),
    apiLocksStamp: 0,	/* Set is not reactive, dummy dep this */
    errorLog: [],
  },

  mutations: {
    lock(state, apiCall) {
      state.apiLocks.add(apiCall);
      state.apiLocksStamp++;
    },
    unlock(state, apiCall) {
      state.apiLocks.delete(apiCall);
      state.apiLocksStamp++;
    },
    logError (state, errorInfo) {
      const apiCall = errorInfo.request.apiCall;
      if (typeof state.errorLog[apiCall] === 'undefined') {
        Vue.set(state.errorLog, apiCall, []);
      }
      state.errorLog[apiCall].push(errorInfo.error);
      if (!(errorInfo.error instanceof SolapiError)) {
        console.log(errorInfo.error.message);
        console.log(errorInfo.error.stack);
      }
    },
  },
  getters: {
    isLocked: (state) => (apiCall) => {
      return state.apiLocks.has(apiCall);
    },
    isProductionServer: (state) => {
      return state.serverPrefix === '';
    },
  },

  actions: {
    async get ({state}, reqDef) {
      /* Due to dev CORS reasons, we need to mangle some API provided URLs */
      let url = reqDef.url.replace(/^http:\/\/sailonline.org\//, '/');
      const params = queryString.stringify(reqDef.params);
      if (params.length > 0) {
        url += '?' + params;
      }

      let response;
      try {
        response = await fetch(state.serverPrefix + url);
      } catch(err) {
        throw new SolapiError('network', err.message);
      }

      if (response.status !== 200) {
        throw new SolapiError('statuscode', "Invalid API call");
      }

      const len = response.headers.get('Content-Length');
      if (len === 0) {
        throw new SolapiError('response', "Empty response");
      }

      const compressedPayload = (typeof reqDef.compressedPayload !== 'undefined');
      let builder;
      let received = 0;
      if (compressedPayload) {
        builder = new pako.Inflate();
      } else {
        builder = [];
      }
      try {
        let r = response.body.getReader();

        while (true) {
          let {done, value} = await r.read();
          if (done) {
            break;
          }
          builder.push(value);
          if (compressedPayload && (builder.err !== 0)) {
            throw new SolapiError('parsing', "Decompress fails!");
          }
          received += value.length;
        }
      } catch(err) {
        throw new SolapiError('network', err.message);
      }

      let data;
      if (compressedPayload) {
        if (typeof builder.result === 'undefined') {
          throw new SolapiError('parsing', "Decompress incomplete!");
        }
        data = builder.result;
      } else {
        data = new Uint8Array(received);
        let at = 0;
        for (let chunk of builder) {
          data.set(chunk, at);
          at += chunk.length;
        }
      }

      try {
        data = new TextDecoder('utf-8').decode(data);
      } catch(err) {
        throw new SolapiError('parsing', "UTF-8 decode fails");
      }

      let result;
      try {
        result = await parseString(data, {explicitArray: reqDef.useArrays});
      } catch(err) {
        throw new SolapiError('parsing', err.message);
      }

      if (!(result.hasOwnProperty(reqDef.dataField))) {
        throw new SolapiError('response', "Response missing datafield: " + reqDef.dataField);
      }

      return result[reqDef.dataField];
    },


    async post ({state, commit}, reqDef) {
      let res;
      try {
        res = await __post(state, reqDef)
      } catch(err) {
        commit('logError', {
          request: reqDef,
          error: err,
        });
        throw err;
      }

      return res;
    },
  },
}
