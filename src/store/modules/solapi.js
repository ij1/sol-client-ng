import Vue from 'vue';
import queryString from 'querystring';
import axios from 'axios';
import promisify from 'util.promisify';
import pako from 'pako';
import * as xml2js from 'isomorphic-xml2js';
import { SolapiError } from '../../lib/solapi.js';

const parseString = promisify(xml2js.parseString);

const WEIGHT = 1.0/32;

function statsUpdate(stats, newValue) {
  if (newValue === null) {
    return;
  }
  if (stats.max < newValue) {
    stats.max = newValue;
  }
  if (stats.avg !== null) {
    stats.avg = stats.avg * (1 - WEIGHT) + newValue * WEIGHT;
  } else {
    stats.avg = newValue;
  }
  if (typeof stats.sum !== 'undefined') {
    stats.sum += newValue;
  }
}

function abortReq(rootState, dispatch, abortFunc, reqDef) {
  abortFunc();
  if (rootState.diagnostics.cfg.extraNetDebug.value) {
    dispatch('diagnostics/add', 'net: ABORT ' + reqDef.apiCall,
             {root: true});
  }
}

function calcTimeout(apiStat, backoff) {
  return Math.min(Math.max(Math.min(apiStat.avg * 8,
                                    apiStat.max * 2) * (2 ** backoff),
                           15000),
                  120000);
}

export default {
  namespaced: true,

  state: {
    // eslint-disable-next-line
    serverPrefix: process.env.VUE_APP_API_URL,
    apiLocks: new Set(),
    apiLocksStamp: 0,	/* Set is not reactive, dummy dep this */
    apiCallStats: {},
    activeApiCalls: {},
    activeApiCallId: -1,
    pastApiCalls: [],
    hasAbort: typeof window.AbortController !== 'undefined',
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

    start(state, apiCall) {
      state.activeApiCallId++;
      const now = performance.now();

      Vue.set(state.activeApiCalls, '' + state.activeApiCallId, {
        id: '' + state.activeApiCallId,
        apiCall: apiCall,
        startTime: now,
        lastUpdate: now,
        firstByteDelay: null,
        readDelayMax: null,
        received: 0,
        len: null,
      });

      if (typeof state.apiCallStats[apiCall] === 'undefined') {
        Vue.set(state.apiCallStats, apiCall, {
          apiCall: apiCall,
          count: 1,
          backoff: 0,
          errors: 0,
          errorLog: [],
          firstByteDelay: {
            max: 0,
            avg: null,
          },
          readDelay: {
            max: 0,
            avg: null,
          },
          size: {
            max: 0,
            avg: null,
            sum: 0,
          },
          duration: {
            max: 0,
            avg: null,
            sum: 0,
          },
        });
      } else {
        state.apiCallStats[apiCall].count++;
      }
    },
    update(state, apiCallUpdate) {
      let item = state.activeApiCalls[apiCallUpdate.id];
      let statsItem = state.apiCallStats[item.apiCall];
      const now = performance.now();
      const readDelay = now - item.lastUpdate;

      item.received = apiCallUpdate.received;
      item.lastUpdate = now;
      if (item.firstByteDelay === null) {
        item.firstByteDelay = readDelay;
        item.len = apiCallUpdate.len;
        statsUpdate(statsItem.firstByteDelay, readDelay);
      } else if ((readDelay === null) || (readDelay > item.readDelayMax)) {
        item.readDelayMax = readDelay;
        statsUpdate(statsItem.readDelay, readDelay);
      }
    },
    complete(state, completeData) {
      let item = state.activeApiCalls[completeData.id];
      let statsItem = state.apiCallStats[item.apiCall];

      item.status = completeData.status;
      if (completeData.status === 'OK') {
        item.duration = performance.now() - item.startTime;
        statsItem.backoff = 0;
        statsUpdate(statsItem.duration, item.duration);
        statsUpdate(statsItem.size, item.received);
      } else {
        item.duration = null;
        if (statsItem.backoff < 30) {
          statsItem.backoff++;
        }
      }

      state.pastApiCalls.unshift(item);
      if (state.pastApiCalls.length > 20) {
        state.pastApiCalls.pop();
      }
      delete state.activeApiCalls[completeData.id];
    },

    logError (state, errorInfo) {
      const apiCall = errorInfo.request.apiCall;
      state.apiCallStats[apiCall].errors++;
      state.apiCallStats[apiCall].errorLog.push(errorInfo.error);
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
    async get ({state, rootState, commit, dispatch}, reqDef) {
      const compressedPayload = (typeof reqDef.compressedPayload !== 'undefined');
      const useFetch = state.hasAbort;

      /* Due to dev CORS reasons, we need to mangle some API provided URLs */
      let url = reqDef.url.replace(/^http:\/\/sailonline.org\//, '/');
      const params = queryString.stringify(reqDef.params);

      commit('start', reqDef.apiCall);
      if (rootState.diagnostics.cfg.extraNetDebug.value &&
          (reqDef.apiCall !== 'tiles')) {
        dispatch('diagnostics/add', 'net: start ' + reqDef.apiCall,
                 {root: true});
      }
      const apiStats = state.apiCallStats[reqDef.apiCall];
      const apiCallUpdate = {
        id: state.activeApiCallId,
        len: null,
        received: 0,
      }

      let controller;
      let abortFunc;
      if (useFetch) {
        controller = new AbortController();
        abortFunc = controller.abort.bind(controller);
      } else {
        controller = axios.CancelToken.source();
        abortFunc = controller.cancel.bind(controller);
      }
      let timer = null;

      let data;
      try {
        let response;
        timer = setTimeout(abortReq,
                           calcTimeout(apiStats.firstByteDelay, apiStats.backoff),
                           rootState, dispatch, abortFunc, reqDef);
        try {
          if (useFetch) {
            response = await fetch(state.serverPrefix + url +
                                   ((params.length > 0) ? '?' + params : ''), {
              signal: controller.signal,
            });
          } else {
            response = await axios.get(state.serverPrefix + url, {
              responseType: 'arraybuffer',
              params: reqDef.params,
              cancelToken: controller.token,
            });
          }
        } catch(err) {
          throw new SolapiError('network', err.message);
        }

        if (response.status !== 200) {
          throw new SolapiError('statuscode', "Invalid API call");
        }

        let len = null;
        if (useFetch) {
          len = response.headers.get('Content-Length');
        } else {
          if (response.headers.hasOwnProperty('content-length')) {
            len = response.headers['content-length'];
          }
        }
        if (len === 0) {
          throw new SolapiError('response', "Empty response");
        }
        apiCallUpdate.len = len;

        let builder;
        if (compressedPayload) {
          builder = new pako.Inflate();
        } else {
          builder = [];
        }
        let r;
        try {
          if (useFetch) {
            r = response.body.getReader();
          }
        } catch(err) {
          throw new SolapiError('network', err.message);
        }

        while (true) {
          let read;
          try {
            if (useFetch) {
              read = await r.read();
            } else {
              read = {
                done: false,
                value: new Uint8Array(response.data),
              };
            }
          } catch(err) {
            throw new SolapiError('network', err.message);
          }

          clearTimeout(timer);
          timer = null;

          if (read.done) {
            break;
          }
          builder.push(read.value);
          if (compressedPayload && (builder.err !== 0)) {
            throw new SolapiError('parsing', "Decompress fails!");
          }
          apiCallUpdate.received += read.value.length;
          commit('update', apiCallUpdate);

          if (!useFetch) {
            break;
          }

          timer = setTimeout(abortReq,
                             calcTimeout(apiStats.readDelay, apiStats.backoff),
                             rootState, dispatch, abortFunc, reqDef);
        }

        if (compressedPayload) {
          if (typeof builder.result === 'undefined') {
            throw new SolapiError('parsing', "Decompress incomplete!");
          }
          data = builder.result;
        } else {
          data = new Uint8Array(apiCallUpdate.received);
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
        commit('complete', {
          id: apiCallUpdate.id,
          status: 'OK',
        });
        if (rootState.diagnostics.cfg.extraNetDebug.value &&
            (reqDef.apiCall !== 'tiles')) {
          dispatch('diagnostics/add', 'net: OK ' + reqDef.apiCall,
                   {root: true});
        }
      } catch (err) {
        commit('complete', {
          id: apiCallUpdate.id,
          status: 'ERROR',
          error: err,
        });
        if (timer !== null) {
          clearTimeout(timer);
        }
        if (rootState.diagnostics.cfg.extraNetDebug.value) {
          dispatch('diagnostics/add', 'net: FAIL ' + reqDef.apiCall,
                   {root: true});
        }
        throw err;
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

    async post ({state, rootState, commit, dispatch}, reqDef) {
      const useFetch = state.hasAbort;

      commit('start', reqDef.apiCall);
      if (rootState.diagnostics.cfg.extraNetDebug.value) {
        dispatch('diagnostics/add', 'net: start ' + reqDef.apiCall,
                 {root: true});
      }
      const apiStats = state.apiCallStats[reqDef.apiCall];
      const apiCallUpdate = {
        id: state.activeApiCallId,
        len: null,
        received: 0,
      }

      let controller;
      let abortFunc;
      if (useFetch) {
        controller = new AbortController();
        abortFunc = controller.abort.bind(controller);
      } else {
        controller = axios.CancelToken.source();
        abortFunc = controller.cancel.bind(controller);
      }
      let timer = null;

      let data;
      try {
        let response;
        timer = setTimeout(abortReq,
                           calcTimeout(apiStats.firstByteDelay, apiStats.backoff),
                           rootState, dispatch, abortFunc, reqDef);
        try {
          if (useFetch) {
            response = await fetch(state.serverPrefix + reqDef.url, {
              method: "POST",
              body: queryString.stringify(reqDef.params),
              signal: controller.signal,
            });
          } else {
            response = await axios.post(state.serverPrefix + reqDef.url,
                                        queryString.stringify(reqDef.params), {
                                          headers: {
                                            'Content-Type': 'application/x-www-form-urlencoded'
                                          },
                                          cancelToken: controller.token,
                                        });
          }
        } catch(err) {
          throw new SolapiError('network', err.message);
        }

        if (response.status !== 200) {
          throw new SolapiError('statuscode', "Invalid API call");
        }

        try {
          if (useFetch) {
            data = await response.text();
          } else {
            data = response.data;
          }
        } catch(err) {
          throw new SolapiError('network', err.message);
        }
        apiCallUpdate.received = data.length;
        clearTimeout(timer);
        timer = null;
        commit('update', apiCallUpdate);
        commit('complete', {
          id: apiCallUpdate.id,
          status: 'OK',
        });
        if (rootState.diagnostics.cfg.extraNetDebug.value) {
          dispatch('diagnostics/add', 'net: OK ' + reqDef.apiCall,
                   {root: true});
        }

      } catch (err) {
        commit('complete', {
          id: apiCallUpdate.id,
          status: 'ERROR',
          error: err,
        });
        if (timer !== null) {
          clearTimeout(timer);
        }
        if (rootState.diagnostics.cfg.extraNetDebug.value) {
          dispatch('diagnostics/add', 'net: FAIL ' + reqDef.apiCall,
                   {root: true});
        }
        commit('logError', {
          request: reqDef,
          error: err,
        });

        throw err;
      }

      try {
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
            throw new SolapiError('response', "Response missing datafield: " +
                                              reqDef.dataField);
          }
          return result[reqDef.dataField];
        }
      } catch(err) {
        commit('logError', {
          request: reqDef,
          error: err,
        });
        throw err;
      }
    },
  },
}
