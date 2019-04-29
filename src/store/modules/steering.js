import { orderBy } from 'lodash';
import { UTCToMsec } from '../../lib/utils.js';
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
      needReload: true,
    },

    visualSteering: {
      enabled: false,
      showPolar: false,
      twa: null,
    },

    cfg: {
      alwaysShowPolar: {
        value: false,
        type: 'boolean',
        cfgText: 'Always show polar when steering visually',
      },
      predictors: {
        value: 'current',
        type: 'values',
        values: ['current', 'both', 'none'],
        cfgText: 'Show predictor(s):',
      }
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

    updateDCs (state, dcList) {
      state.dcs.list = orderBy(dcList, 'time', 'asc')
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
      state.visualSteering.twa = null;
    },
    visualSteeringSetTwa (state, twa) {
      state.visualSteering.twa = twa;
    },
    configSetValue,
  },

  actions: {
    fetchDCs({state, rootState, commit, dispatch}) {
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
        commit('updateDCs', dcList);
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
