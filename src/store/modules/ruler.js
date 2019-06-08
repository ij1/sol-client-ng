export default {
  namespaced: true,

  state: {
    enabled: false,
  },

  mutations: {
    on (state) {
      state.enabled = true;
    },
    off (state) {
      state.disabled = true;
    },
  },
}
