import { orderBy } from 'lodash';
import { UTCToMsec, secToMsec } from '../../lib/utils.js';
import { solapiRetryDispatch } from '../../lib/solapi.js';

export default {
  namespaced: true,

  state: {
    racemsgs: [],
    lastId: 0,
    expectedId: 0,
    uiShownId: 0,
  },

  mutations: {
    add (state, messages) {
      for (let i = messages.length - 1; i >= 0; i--) {
        let message = messages[i];
        const newId = parseInt(message.id);
        if (!Number.isFinite(newId)) {
          continue;
        } else if (newId <= state.lastId) {
          continue;
        } else if (newId > state.lastId) {
          state.lastId = newId;
        }
        message.message = ('<p>' + message.message
                                     .replace(/\r\n?/g, '\n')
                                     .replace(/\n/g, '</p><p>') + '</p>')
                                     .replace(/<p><\/p>/g, '');
        message.lastUpdated = UTCToMsec(message.last_updated);
        delete message.last_updated;

        state.racemsgs.unshift(message);
      }
      state.racemsgs = orderBy(state.racemsgs, 'lastUpdated', 'desc');
    },
    setExpected(state, expectedId) {
      if (expectedId > state.expectedId) {
        state.expectedId = expectedId;
      }
    },
    setShownId (state, newId) {
      if (newId === null) {
        state.uiShownId = state.lastId;
      } else {
        state.uiShownId = newId;
      }
    },
  },
  getters: {
    localStorageKey: (state, getters, rootState) => {
      return 'sol-race-messages-shown-id:' + rootState.race.info.id;
    },
  },

  actions: {
    fetch({state, rootState, commit, dispatch}) {
      const getDef = {
        url: "/webclient/race_messages.xml",
        params: {
          token: rootState.auth.token,
          request_msg_id: state.lastId + 1, /* Doesn't seem to work as expected */
        },
        useArrays: false,
        dataField: 'racemessages',
      };

      dispatch('solapi/get', getDef, {root: true})
      .then(raceMessages => {
        if (typeof raceMessages.racemessage === 'undefined') {
          return;
        }
        if (!Array.isArray(raceMessages.racemessage)) {
          raceMessages.racemessage = [raceMessages.racemessage];
        }
        const oldLastId = state.lastId;
        commit('add', raceMessages.racemessage);
        if (state.lastId > oldLastId) {
          commit('ui/setActiveTab', 4, {root: true});
          /*
           * This causes one unnecessary raceinfo fetch in start sequence
           * when a race message is picked up but it should be harmless
           */
          dispatch('race/fetchRaceinfo', null, {root: true});
        }
      })
      .catch(err => {
        commit('solapi/logError', {
          apiCall: 'racemsgs',
          error: err,
        }, {root: true});
      })
      .finally(() => {
        /* New messages appeared during our last fetch, fetch again */
        if (state.expectedId > state.lastId) {
          const refetchDelay = secToMsec(5) + secToMsec(15) * Math.random();
          solapiRetryDispatch(dispatch, 'fetch', undefined, refetchDelay);
        }
      });
    },
    updateExpected({state, commit, dispatch}, expectedId) {
      if (expectedId > state.expectedId) {
        const oldExpectedId = state.expectedId;
        commit('setExpected', expectedId);
        if (oldExpectedId === state.lastId) {
          dispatch('fetch');
        }
      }
    },
    loadShownId({getters, commit}) {
      const val = localStorage.getItem(getters['localStorageKey']);
      if (val !== null) {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          commit('setShownId', num);
        }
      }
    },
    updateShownId({state, getters, commit}) {
      commit('setShownId', null);
      localStorage.setItem(getters['localStorageKey'], state.uiShownId);
    },
  },
}
