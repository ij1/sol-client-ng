function secTimer (state, commit) {
  commit('update');
  const delay = 1000 - ((state.realTime + 2) % 1000);
  setTimeout(secTimer, delay, state, commit);
}

export default {
  namespaced: true,

  state: {
    clockOffset: 0,
    realTime: 0,
    siteTime: performance.now(),
  },

  mutations: {
    update (state) {
      state.realTime = Date.now() + state.clockOffset;
      state.siteTime = performance.now();
    },
  },

  getters: {
    /* The results of this call MUST NOT be cached, thus the fancy use
     * of parenthesis.
     */
    now: state => () => {
      return Date.now() + state.clockOffset;
    },
  },

  actions: {
    init ({state, commit}) {
      secTimer(state, commit);
    },
  },
}
