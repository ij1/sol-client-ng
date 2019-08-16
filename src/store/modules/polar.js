import { degToRad, bsearchLeft, interpolateFactor, linearInterpolate } from '../../lib/utils.js';
import { speedTowardsBearing } from '../../lib/nav.js';
import { MS_TO_KNT } from '../../lib/sol.js';
import { SolapiDataError } from '../../lib/solapi.js';

export default {
  namespaced: true,

  state: {
    loaded: false,
    twsval: [],
    twaval: [],
    bs: [],

    curves: [3, 6, 9, 12, 15, 20, 25, 30],
    windKeys: [3, 6, 9, 12, 15, 20, 25, 30, 40, 50],
    twaInterval: 1,
  },

  mutations: {
    set(state, polarData) {
      state.twsval = polarData.twsval;
      state.twaval = polarData.twaval;
      state.bs = polarData.bs;
      state.loaded = true;
    },
  },

  getters: {
    maxTws: (state) => {
      return state.twsval[state.twsval.length - 1];
    },
    getSpeed: (state, getters) => (twsms, twa) => {
      twa = Math.abs(twa);

      let twsidx = bsearchLeft(state.twsval, twsms);
      let twaidx = bsearchLeft(state.twaval, twa);
      if (twsidx > 0) {
        /* Wind beyond the max tws defined by the polar? */
        if (twsms > getters.maxTws) {
          twsms = getters.maxTws;
          twsidx = state.twsval.length - 1;
        }
        twsidx--;
      }
      if (twaidx > 0) {
        /* Make sure different roundings of +/-180 don't overflow the index */
        if (twaidx > state.twaval.length - 1) {
          twaidx = state.twaval.length - 1;
          twa = state.twaval[twaidx];
        }
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

    curve: (state, getters) => (knots, interval) => {
      const ms = knots / MS_TO_KNT;
      let curve = {
        ms: ms,
        knots: knots,
        maxvmg: {
          up: { twa: 0, vmg: 0, },
          down: { twa: 0, vmg: 0, },
        },
        maxspeed: {
          twa: 0, speed: 0,
        },
        values: [],
      }
      for (let twad = 0; twad <= 180; twad += interval) {
        const twa = degToRad(twad);

        const speed = getters['getSpeed'](ms, twa);
        curve.values.push({twa: twa, speed: speed});

        if (speedTowardsBearing(speed, twa, 0) > curve.maxvmg.up.vmg) {
          curve.maxvmg.up.vmg = speedTowardsBearing(speed, twa, 0);
          curve.maxvmg.up.twa = twa;
        }
        if (speedTowardsBearing(speed, twa, Math.PI) < curve.maxvmg.down.vmg) {
          curve.maxvmg.down.vmg = speedTowardsBearing(speed, twa, Math.PI);
          curve.maxvmg.down.twa = twa;
        }
        if (speed > curve.maxspeed.speed) {
          curve.maxspeed.speed = speed;
          curve.maxspeed.twa = twa;
        }
      }
      // ADDME: refine maxvmg calculations!

      return curve;
    },

    staticCurves: (state, getters) => {
      let res = [];
      for (let knots of state.curves) {
        res.push(getters['curve'](knots, state.twaInterval));
      }
      return res;
    },
    currentCurve: (state, getters, rootState) => {
      const knots = rootState.boat.instruments.tws.value * MS_TO_KNT;
      return getters['curve'](knots, state.twaInterval);
    },
  },
  actions: {
    parse ({dispatch, commit}, rawData) {
      let polarData = {};
      polarData.twsval = Object.freeze(rawData.tws_splined.split(/\s+/).map(parseFloat));
      polarData.twaval = Object.freeze(rawData.twa_splined.split(/\s+/).map(parseFloat).map(degToRad));

      let rows = rawData.bs_splined.split(/;\s*/);

      if (rows.length !== polarData.twaval.length + 1) {
        dispatch(
          'diagnostics/add',
          'DATA ERROR: Inconsistent polar lengths:' +
          rows.length + ' ' + (polarData.twaval.length + 1),
          {root: true}
        );
        /* Throw here to force a retry, no point to sail without a polar? */
        throw new SolapiDataError('polar', 'Polar data length error');
      }

      let bs = [];
      for (let i = 0; i < rows.length - 1; i++) {
        let tmp = rows[i].split(/\s+/).map(parseFloat);
        if (tmp.length !== polarData.twsval.length) {
          dispatch(
            'diagnostics/add',
            'DATA ERROR: Inconsistent polar lengths:' +
            tmp.length + ' ' + polarData.twsval.length,
            {root: true}
          );
          /* Throw here to force a retry, no point to sail without a polar? */
          throw new SolapiDataError('polar', 'Polar data length error');
        }
        bs.push(Object.freeze(tmp));
      }
      polarData.bs = Object.freeze(bs);
      commit('set', polarData);
    },
  },
}
