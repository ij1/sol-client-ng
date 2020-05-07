import { UTCToMsec, secToMsec } from '../../lib/utils.js';

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
    applyCorrection (state, correction) {
      state.clockOffset = correction;
    }
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
    async init ({state, dispatch, commit}) {
      secTimer(state, commit);
      await dispatch('checkOffset');
    },
    async checkOffset ({dispatch, commit}) {
      const getDef = {
        apiCall: 'time',
        url: '/webclient/time.xml',
        useArrays: false,
        dataField: 'response',
      };
      try {
        const preNow = Date.now();
        const data = await dispatch('solapi/get', getDef, {root: true});
        const postNow = Date.now();
        const peerNow = UTCToMsec(data.time);

        const lowCorrection = (preNow - secToMsec(1)) - peerNow;
        const highCorrection = peerNow - (postNow + secToMsec(1));
        const correction = (lowCorrection > 0) ? -lowCorrection :
                           (highCorrection > 0) ? highCorrection : 0;
        if (correction !== 0) {
          commit('applyCorrection', correction);
          dispatch('diagnostics/add', 'Clock correction: ' + correction,
                   {root: true});
        } else {
          dispatch('diagnostics/add', 'Time check OK!', {root: true});
        }
      } catch (err) {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
      }
    },
  },
}
