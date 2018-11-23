import { radToDeg, bsearchLeft, interpolateFactor, linearInterpolate } from '../../lib/utils.js';

export default {
  namespaced: true,

  state: {
    twsval: [],
    twaval: [],
    bs: [],
  },

  mutations: {
    set(state, polar) {
      state.twsval = polar.tws_splined.split(/\s+/).map(parseFloat);
      state.twaval = polar.twa_splined.split(/\s+/).map(parseFloat);

      let rows = polar.bs_splined.split(/;\s*/);

      if (rows.length !== state.twaval.length + 1) {
        console.log("Inconsistent polar!");
      }

      let bs = [];
      for (let i = 0; i < rows.length - 1; i++) {
        let tmp = rows[i].split(/\s+/).map(parseFloat);
        if (tmp.length !== state.twsval.length) {
          console.log("Inconsistent polar check!");
        }
        bs.push(tmp);
      }
      state.bs = bs;

      Object.freeze(state.twsval);
      Object.freeze(state.twaval);
      Object.freeze(state.bs);
    },
  },

  getters: {
    twsmsTwaToSpeed: (state) => (twsms, twa) => {
      twa = radToDeg(Math.abs(twa));

      let twsidx = bsearchLeft(state.twsval, twsms);
      let twaidx = bsearchLeft(state.twaval, twa);
      if (twsidx === state.twsval.length - 1) {
        twsidx--;
      }
      if (twaidx === state.twaval.length - 1) {
        twaidx--;
      }

      const twsFactor = interpolateFactor(state.twsval[twsidx],
                                          twsms,
                                          state.twsval[twsidx+1]);
      const twaFactor = interpolateFactor(state.twaval[twaidx],
                                          twa,
                                          state.twaval[twaidx+1]);

      const a = linearInterpolate(twsFactor,
                                  state.bs[twaidx][twsidx],
                                  state.bs[twaidx][twsidx+1]);
      const b = linearInterpolate(twsFactor,
                                  state.bs[twaidx+1][twsidx],
                                  state.bs[twaidx+1][twsidx+1]);

      return linearInterpolate(twaFactor, a, b);
    },
  },
}
