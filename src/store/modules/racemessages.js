import { orderBy } from 'lodash';

export default {
  namespaced: true,

  state: {
    racemsgs: [],
    lastId: 0,
    expectedId: 0,
  },

  mutations: {
    add (state, messages) {
      state.racemsgs = orderBy(messages.concat(state.racemsgs), 'last_updated', 'desc');
      for (let i = 0; i < state.racemsgs.length; i++) {
        const newId = parseInt(state.racemsgs[i].id);
        if (Number.isFinite(newId) && newId > state.lastId) {
          state.lastId = newId;
        }
      }
    },
    updateExpected(state, expectedId) {
      if (expectedId > state.expectedId) {
        if (state.expectedId == state.lastId) {
          this.dispatch('race/messages/fetch');
        }
      }
      state.expectedId = expectedId;
    }    
  },

  actions: {
    fetch({rootState, state, commit, dispatch}) {
      const getDef = {
        url: "/webclient/race_messages.xml",
        params: {
          token: rootState.auth.token,
          request_msg_id: state.lastid,
        },
        useArrays: false,
        dataField: 'racemessages',

        dataHandler: (raceMessages) => {
          if (!raceMessages.hasOwnProperty('racemessage')) {
            return;
          }
          if (!Array.isArray(raceMessages.racemessage)) {
            raceMessages.racemessage = [raceMessages.racemessage];
          }
          commit('add', raceMessages.racemessage);
          /* New messages appeared during our last fetch, fetch again */
          if (state.expectedId > state.lastId) {
            dispatch('fetch');
          }
        },
      }

      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
