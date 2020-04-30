export default {
  namespaced: true,

  state: {
    standalone: (typeof window.token === 'undefined') ||
                (typeof window.theracenumber === 'undefined'),
    status: 'Unauthenticated',
    token: null,
    raceId: null,
    authParams: null,
  }, 

  mutations: {
    storeCredentials (state, authParams) {
      state.authParams = authParams;
    },
    setToken (state, params) {
      state.status = 'Authenticated';
      state.token = params.token;
      state.raceId = params.raceId;
    },
    loginFailed (state) {
      state.status = 'Login failed';
    },
  },

  actions: {
    login ({state, dispatch, commit}, authParams) {
      const reauth = authParams === null && state.authParams !== null;

      const getDef = {
        apiCall: 'auth',
        url: '/webclient/authenticate.xml',
        params: !reauth ? authParams : state.authParams,
        useArrays: false,
        dataField: 'response',
      };

      dispatch('solapi/get', getDef, {root: true})
      .then(response => {
        if (typeof response.token === 'undefined') {
          commit('loginFailed');
          return;
        }
        if (!reauth) {
          commit('storeCredentials', authParams);
        }
        commit('setToken', {
          token: response.token,
          raceId: !reauth ? authParams.race_id : state.raceId,
        });
        if (!reauth) {
          dispatch('race/fetchRaceinfo', null, {root: true});
        } else {
          dispatch('diagnostics/add', 'auth: reauthenticated', {root: true});
        }
      })
      .catch(err => {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
        if (!reauth) {
          commit('loginFailed');
        }
      });
    },
    async reauth ({state, dispatch, commit}) {
      dispatch('diagnostics/add', 'auth: reauthentication start', {root: true});
      if (state.standalone) {
        dispatch('login', null);
        return;
      }
      try {
        let response = await fetch(window.location.href, {cache: "reload"});
        if (response.status !== 200) {
          return;
        }
        let html = await response.text();
        let parser = new DOMParser();
        let tree = parser.parseFromString(html, 'text/html');
        let candidate = tree.getElementById("token").innerHTML;
        if (candidate !== null) {
          const regex = /^token="([0-9a-f]{16,128})";$/
          const match = candidate.match(regex);
          if (match !== null) {
            commit('setToken', {
              token: match[1],
              raceId: state.raceId,
            });
            dispatch('diagnostics/add', 'auth: reauthenticated', {root: true});
            return;
          }
        }
        dispatch('diagnostics/add', 'auth: no reauth token', {root: true});
      } catch {
        dispatch('diagnostics/add', 'auth: reauth error', {root: true});
      }
    },
  },
}
