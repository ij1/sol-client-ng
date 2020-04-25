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
        apiCall: 'auth',
        url: '/webclient/authenticate.xml',
        params: authParams,
        useArrays: false,
        dataField: 'response',
      };

      dispatch('solapi/get', getDef, {root: true})
      .then(response => {
        if (typeof response.token === 'undefined') {
          commit('loginFailed');
          return;
        }
        authParams.token = response.token;
        commit('loggedIn', authParams);
        dispatch('race/fetchRaceinfo', null, {root: true});
      })
      .catch(err => {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
        commit('loginFailed');
      });
    },
  },
}
