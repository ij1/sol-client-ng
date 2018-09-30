import { orderBy } from 'lodash';

export default {
  namespaced: true,

  state: {
    dcs: {
      list: [],
      fetching: false,
      needReload: true,
    }
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
    }
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
          if (typeof dcData.cmd !== 'undefined') {
            let dcList = dcData.cmd
          
            if (!Array.isArray(dcList)) {
              dcList = [dcList];
            }
            commit('updateDCs', dcList);
          }
          commit('setFetching', false);

          if (state.dcs.needReload) {
            dispatch('fetchDCs');
          }
        },
      };

      commit('setFetching', true);
      dispatch('solapi/get', getDef, {root: true});
    },
  },
}
