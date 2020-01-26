import { configSetValue } from '../../components/config/configstore.js';

export default {
  namespaced: true,

  state: {
    contoursDebug: {
      minLngCell: -1,
      maxLngCell: -1,
      minLatCell: -1,
      maxLatCell: -1,
      yStart: -1,
      yEnd: -1,
      yStartLat: -1,
      yEndLat: -1,
    },
    messages: [],
    idCount: 0,

    cfg: {
      showDiagnostics: {
        value: false,
        type: 'boolean',
        cfgText: 'Show diagnostics',
      },
      extraDebug: {
        value: false,
        type: 'boolean',
        cfgText: 'Extra diagnostics',
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
    contours (state, data) {
      state.contoursDebug = data;
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
