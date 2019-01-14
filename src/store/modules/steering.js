import { orderBy } from 'lodash';
import { UTCToMsec } from '../../lib/utils.js';


export default {
  namespaced: true,

  state: {
    dcs: {
      list: [],
      fetching: false,
      needReload: true,
    },
    sending: false,
  },

  mutations: {
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
    setSending (state) {
      state.sending = true;
    },
    clearSending (state) {
      state.sending = false;
    },
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

        dataHandler: (dcData) => {
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
        },
      };

      commit('setFetching', true);
      dispatch('solapi/get', getDef, {root: true});
    },

    sendSteeringCommand({rootState, commit, dispatch}, sendParams) {
      commit('setSending');

      const postDef = {
        url: '/webclient/command/post/?token=' + rootState.auth.token,
        params: sendParams,
        useArrays: false,
      };

      return dispatch('solapi/post', postDef, {root: true})
        .catch(() => {
          /* FIXME: Should retry a number of times before giving up? */
          commit('clearSending');
        })
        .then(() => {
          commit('clearSending');
          if (sendParams.delay > 0) {
            dispatch('fetchDCs');
          }
        });
    },

    sendDeleteDC({rootState, commit, dispatch}, sendParams) {
      commit('setSending');

      const postDef = {
        url: '/webclient/command/delete/?token=' + rootState.auth.token,
        params: sendParams,
        useArrays: false,
        dataField: 'response',
      };

      return dispatch('solapi/post', postDef, {root: true})
        .catch(() => {
          /* FIXME: Should retry a number of times before giving up? */
          commit('clearSending');
        })
        .then(() => {
          commit('clearSending');
          dispatch('fetchDCs');
        });
    },

  },
}
