export default {
  namespaced: true,

  state: {
    clockOffset: 0,
  },

  getters: {
    /* The results of this call MUST NOT be cached, thus we use a closure.
     * The extra parenthesis are to make it accessable as if it would not
     * be a function.
     */
    now: state => (() => {
      return Date.now() + state.clockOffset;
    })(),
  },
}
