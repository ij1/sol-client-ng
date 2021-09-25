import { orderBy } from 'lodash';
import { minToMsec, UTCToMsec } from '../../lib/utils.js';
import { configSetValue } from '../../components/config/configstore.js';
import { solapiRetryDispatch } from '../../lib/solapi.js';

export let predictorData = {
  cog: {
    time: 0,
    cog: 0,
    firstLatLng: null,
    latLngs: [],
    cachedPath: new Path2D(),
  },
  twa: {
    time: 0,
    twa: 0,
    firstLatLng: null,
    latLngs: [],
    cachedPath: new Path2D(),
  },
  dcPred: {
    time: 0,
    twa: 0,
    firstLatLng: null,
    latLngs: [],
    cachedPath: new Path2D(),
  },
};

export default {
  namespaced: true,

  state: {
    /* Steering UI related state */
    plottedSteering: {
      type: 'cc',
      /* These 2 hold raw, unvalidated values in degrees from steering panel */
      cc: '',
      twa: '',
      delayOn: false,
      delay: '',
      delayTime: null,
      delayLatLng: null,
      prevCopyDecimals: 2,
    },

    dcs: {
      list: [],
      fetching: false,
      fetchTime: 0,
      dcFetchInterval: minToMsec(20),
      needReload: true,
    },

    visualSteering: {
      enabled: false,
      showPolar: false,
      twa: null,
    },

    predictorStamp: 0,

    cfg: {
      showPolarImmediately: {
        value: false,
        type: 'boolean',
        cfgText: 'Show polar butterfly always with visual steering',
      },
      predictors: {
        value: 'current',
        type: 'values',
        values: ['current', 'both', 'none'],
        cfgText: 'Show steering predictor(s):',
      },
      predictorDcs: {
        value: false,
        type: 'boolean',
        cfgText: 'Show DC-aware predictor (EXPERIMENTAL)',
      },
      predictorLen: {
        value: '6 h',
        type: 'values',
        values: ['6 h', '12 h', '24 h', '36 h', '48 h', '72h', '120 h', '168 h'],
        cfgText: 'Predictor(s) length:',
      },
      preserveSteeringType: {
        value: false,
        type: 'boolean',
        cfgText: 'Steering tool retains steering type',
      },
    }
  },

  mutations: {
    setType(state, type) {
      state.plottedSteering.type = type;
    },
    setCc(state, cc) {
      state.plottedSteering.cc = cc;
    },
    setTwa(state, twa) {
      state.plottedSteering.twa = twa;
    },
    setSteering(state, cmd) {
      state.plottedSteering.type = cmd.type;
      if (cmd.type === 'cc') {
        state.plottedSteering.cc = cmd.valueText;
      } else {
        state.plottedSteering.twa = cmd.valueText;
      }
    },
    setDelayOn(state, delayOn) {
      state.plottedSteering.delayOn = delayOn;
    },
    setDelay(state, delay) {
      state.plottedSteering.delay = delay;
    },
    setDelayTime(state, delayTime) {
      state.plottedSteering.delayTime = delayTime;
    },
    setDelayLatLng(state, latLng) {
      state.delayLatLng = latLng;
    },
    setPrevCopyDecimals(state, prevCopyDecimals) {
      state.plottedSteering.prevCopyDecimals = prevCopyDecimals;
    },

    updateDCs (state, dcData) {
      state.dcs.list = orderBy(dcData.dcList, 'time', 'asc')
      state.dcs.fetchTime = dcData.fetchTime;
    },

    setFetching (state, newState) {
      state.dcs.fetching = newState;
      if (newState) {
        state.dcs.needReload = false;
      }
    },
    dcsUpdated (state) {
      state.dcs.needReload = true;
    },
    clearDC (state) {
      state.dcs.list.shift();
    },
    visualSteering (state, showPolar) {
      state.visualSteering.enabled = true;
      state.visualSteering.showPolar = showPolar;
    },
    visualSteeringOff (state) {
      state.visualSteering.enabled = false;
      state.visualSteering.showPolar = false;
      state.visualSteering.twa = null;
    },
    visualSteeringSetTwa (state, twa) {
      state.visualSteering.twa = twa;
    },

    updatePredictor (state, data) {
      predictorData[data.predictor] = data.data;
      predictorData[data.predictor].cachedPath = new Path2D();
      state.predictorStamp++;
    },
    updatePredictorPath (state, data) {
      predictorData[data.predictor].cachedPath = data.path;
    },

    configSetValue,
  },
  getters: {
    nextTimeToFetchDCs: (state) => {
      return state.dcs.fetchTime + state.dcs.dcFetchInterval;
    },
    nextDC: (state) => {
      return state.dcs.list.length > 0 ? state.dcs.list[0] : null;
    },
    nextDCDelay: (state, getters, rootState) => {
      if (getters.nextDC === null) {
        return null;
      }
      return Math.max(getters.nextDC.time - rootState.time.realTime, 0);
    },
  },

  actions: {
    fetchDCs({state, rootState, rootGetters, commit, dispatch}, retry = false) {
      if (!retry && state.dcs.fetching) {
        return;
      }

      const getDef = {
        apiCall: 'dclist',
        url: '/webclient/command/delayed/',
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'commands',
      };

      commit('setFetching', true);
      dispatch('solapi/get', getDef, {root: true})
      .then(dcData => {
        const now = rootGetters['time/now']();
        let dcList;
        if (typeof dcData.cmd !== 'undefined') {
          dcList = dcData.cmd

          if (!Array.isArray(dcList)) {
            dcList = [dcList];
          }
        } else {
          dcList = [];
        }
        for (let dc of dcList) {
          dc.time = UTCToMsec(dc.time);
          dc.valid = true;
          dc.origValue = dc.value;
          if (dc.type === 'cc') {
            if (dc.value >= Math.PI * 2) {
              dc.valid = false;
              dc.value = Math.PI * 2;
            }
            if (dc.value < 0.0) {
              dc.valid = false;
              dc.value = 0;
            }
          }
          if (dc.type === 'twa') {
            if (dc.value < -Math.PI) {
              dc.valid = false;
              dc.value = -Math.PI;
            }
            if (dc.value > Math.PI) {
              dc.valid = false;
              dc.value = Math.PI;
            }
          }
        }
        commit('updateDCs', {
          dcList: dcList,
          fetchTime: now,
        });
        commit('setFetching', false);

        if (state.dcs.needReload) {
          dispatch('fetchDCs');
        }
      })
      .catch(err => {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
        solapiRetryDispatch(dispatch, 'fetchDCs', true, 11000);
      });
    },
    resetTime({dispatch}, clock) {
      if (Math.abs(clock.offsetDelta) > minToMsec(1)) {
        dispatch('fetchDCs');
      }
    },

    sendSteeringCommand({rootState, dispatch}, sendParams) {
      const postDef = {
        apiCall: 'steering',
        url: '/webclient/command/post/?token=' + rootState.auth.token,
        params: sendParams,
        useArrays: false,
      };

      let status = 'OK';
      return dispatch('solapi/post', postDef, {root: true})
        .catch(() => {
          /* FIXME: Should retry a number of times before giving up? */
          status = 'ERROR';
        })
        .then(() => {
          return status;
        });
    },

    sendDeleteDC({rootState, dispatch}, sendParams) {
      const postDef = {
        apiCall: 'dcdelete',
        url: '/webclient/command/delete/?token=' + rootState.auth.token,
        params: sendParams,
        useArrays: false,
        dataField: 'response',
      };

      let status = 'OK';
      return dispatch('solapi/post', postDef, {root: true})
        .catch(() => {
          /* FIXME: Should retry a number of times before giving up? */
          status = 'ERROR';
        })
        .then(() => {
          return status;
        });
    },

  },
}
