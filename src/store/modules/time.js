export default {
  namespaced: true,

  state: {
    clockOffset: 0,
  },

  getters: {
    /* The results of this call MUST NOT be cached, thus the fancy use
     * of parenthesis.
     */
    now: state => () => {
      return Date.now() + state.clockOffset;
    },
  },
}
