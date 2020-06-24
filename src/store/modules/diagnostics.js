import { configSetValue } from '../../components/config/configstore.js';

export default {
  namespaced: true,

  state: {
    messages: [],
    idCount: 0,

    cfg: {
      noInitialZoom: {
        value: false,
        type: 'boolean',
        cfgText: 'No initial zoom in',
      },
      showDiagnostics: {
        value: false,
        type: 'boolean',
        cfgText: 'Show diagnostics',
      },
      extraNetDebug: {
        value: false,
        type: 'boolean',
        cfgText: 'Extra network diagnostics',
      },
      extraUiDebug: {
        value: false,
        type: 'boolean',
        cfgText: 'Extra UI diagnostics',
      },
    },
  },

  mutations: {
    /* Call add action instead to get message metadata set correctly */
    __add (state, message) {
      message.id = state.idCount++;
      state.messages.push(message);
      if (state.messages.length > 200) {
        state.messages.shift();
      }
    },

    configSetValue,
  },

  actions: {
    add ({rootGetters, commit}, message) {
      commit('__add', {
        time: rootGetters['time/now'](),
        message: message,
      });
    },
  },
}
