export default {
  namespaced: true,

  state: {
    status: 'Unauthenticated',
    token: null,
    race_id: null,
  }, 

  mutations: {
    loggedIn (state, params) {
      state.status = 'Authenticated';
      state.token = params.token;
      state.race_id = params.race_id;
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
        dataHandler: (response) => {
          if (typeof response.token === 'undefined') {
            commit('loginFailed');
            return;
          }
          authParams.token = response.token
          commit('loggedIn', authParams);
          dispatch('race/fetchAuthRaceinfo', null, {root: true});
        },
        failHandler: () => {
          commit('loginFailed');
        }
      }
      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
