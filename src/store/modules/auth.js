import { SkipThenError, solapiLogError } from '../../lib/solapi.js';

export default {
  namespaced: true,

  state: {
    status: 'Unauthenticated',
    token: null,
    raceId: null,
  }, 

  mutations: {
    loggedIn (state, params) {
      state.status = 'Authenticated';
      state.token = params.token;
      state.raceId = params.race_id;
    },
    loginFailed (state) {
      state.status = 'Login failed';
    },
  },

  actions: {
    login ({dispatch, commit}, authParams) {
      const getDef = {
        url: '/webclient/authenticate.xml',
        params: authParams,
        useArrays: false,
        dataField: 'response',
      };

      dispatch('solapi/get', getDef, {root: true})
      .catch(err => {
        commit('loginFailed');
        solapiLogError(err);
        throw new SkipThenError();
      })
      .then(response => {
        if (typeof response.token === 'undefined') {
          commit('loginFailed');
          return;
        }
        authParams.token = response.token
        commit('loggedIn', authParams);
        dispatch('race/fetchAuthRaceinfo', null, {root: true});
      })
      .catch(err => {
        solapiLogError(err);
      });
    },
  },
}
