import { orderBy } from 'lodash';
import { minToMsec, UTCToMsec } from '../../lib/utils.js';
import { configSetValue } from '../../components/config/configstore.js';

export default {
  namespaced: true,

  state: {
    /* Steering UI related state */
    plottedSteering: {
      type: 'cc',
      cc: '',
      twa: '',
      delayOn: false,
      delay: '',
      delayTime: null,
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
        cfgText: 'Show predictor(s):',
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
        state.plottedSteering.cc = cmd.value;
      } else {
        state.plottedSteering.twa = cmd.value;
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
    fetchDCs({state, rootState, rootGetters, commit, dispatch}) {
      if (state.dcs.fetching) {
        return;
      }

      const getDef = {
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
          apiCall: 'dclist',
          error: err,
        }, {root: true});
      });
    },

    sendSteeringCommand({rootState, dispatch}, sendParams) {
      const postDef = {
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
