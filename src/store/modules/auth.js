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
      state.token = params['token'];
      state.race_id = params['race_id'];
      this.dispatch('race/fetchAuthRaceinfo');
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
          if (!response.hasOwnProperty('token')) {
            commit('loginFailed');
            return;
          }
          authParams['token'] = response.token
          commit('loggedIn', authParams)
        },
        failHandler: () => {
          commit('loginFailed');
        }
      }
      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
