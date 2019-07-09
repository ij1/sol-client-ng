export default {
  namespaced: true,

  state: {
    messages: [],
    idCount: 0,
  },

  mutations: {
    /* Call add action instead to get message metadata set correctly */
    __add (state, message) {
      message.id = state.idCount++;
      state.messages.push(message);
      if (state.message.length > 200) {
        state.messages.shift();
      }
    },
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
