import { degToRad, bsearchLeft, interpolateFactor, linearInterpolate } from '../../lib/utils.js';
import { speedTowardsBearing, cogTwdToTwa } from '../../lib/nav.js';
import { MS_TO_KNT } from '../../lib/sol.js';
import { SolapiDataError } from '../../lib/solapi.js';

function diffCurves(prev, next) {
  let maxDiff = 0;
  for (let i = 0; i < prev.values.length; i++) {
    if (prev.values[i].speed === 0) {
      continue;
    }
    maxDiff = Math.max(Math.abs(1 - next.values[i].speed / prev.values[i].speed),
                       maxDiff);
  }
  return maxDiff;
}

function polarSlope (twa0, value0, twa1, value1) {
  const dy = value1 - value0;
  const dx = twa1 - twa0;
  const k = dy / dx;

  return {
    k: k,
    b: value0 - k * twa0,
  };
}

/* We use the dx from polar coordinate equation here (our coordinates are
 * rotated compared with the mathematical axis, thus dx is the correct one):
 *  r'(x)*cos(x) - r(x)*sin(x)
 *  k*cos(x) - (k*x+b)*sin(x)
 */
function slopeDy (twa, slope) {
  return slope.k * Math.cos(twa) - (slope.k * twa + slope.b) * Math.sin(twa);
}

function findZeroSlope (twa0, twa1, slope, acc=null) {
  let min = twa0;
  let max = twa1;
  if (acc === null) {
    acc = degToRad(0.0005);
  }

  const firstVal = slopeDy(min, slope);
  if (firstVal === 0) {
    return min;
  }

  let dir = 1;
  if (firstVal > 0) {
    dir = -1;
  }

  while (max - min > acc) {
    let mid = (max + min) / 2;
    let val = slopeDy(mid, slope) * dir;
    if (val === 0) {
      return mid;
    } else if (val < 0) {
      min = mid;
    } else {
      max = mid;
    }
  }
  return min;
}

export default {
  namespaced: true,

  state: {
    loaded: false,
    twsval: [],
    twaval: [],
    bs: [],
    maxBs: null,

    twaInterval: 1,

    polarMode: 'default',
    polarModes: {
      'low TWS': {
        label: 'low TWS',
        curves: [1, 2, 3, 4, 5, 6],
      },
      'normal': {
        label: '1-30 kn',
        curves: [3, 6, 9, 12, 15, 20, 25, 30],
      },
      'default': {
        label: 'default',
        curves: [3, 6, 9, 12, 15, 20, 25, 30, 40, 50],
      }
    },
  },

  mutations: {
    set(state, polarData) {
      state.twsval = polarData.twsval;
      state.twaval = polarData.twaval;
      state.bs = polarData.bs;
      state.maxBs = polarData.max;
      state.loaded = true;
    },
    setPolarMode(state, newMode) {
      state.polarMode = newMode;
    },
  },

  getters: {
    maxTws: (state) => {
      return state.twsval[state.twsval.length - 1];
    },
    windKeys: (state) => {
      return state.polarModes[state.polarMode].curves;
    },
    getSpeed: (state, getters) => (twsms, twa) => {
      twa = Math.abs(twa);

      let twsidx = bsearchLeft(state.twsval, twsms);
      let twaidx = bsearchLeft(state.twaval, twa);
      if (twsidx > 0) {
        /* Wind beyond the max tws defined by the polar? */
        if (twsms > getters.maxTws) {
          twsidx = state.twsval.length - 1;
          twsms = state.twsval[twsidx];
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

    curve: (state, getters) => (knots, interval = null) => {
      const ms = knots / MS_TO_KNT;
      if (interval === null) {
        interval = state.twaInterval;
      }

      let curve = {
        ms: ms,
        knots: knots,
        interval: degToRad(interval),
        maxvmg: {
          up: { twa: 0, vmg: 0, },
          down: { twa: 0, vmg: 0, },
        },
        maxspeed: {
          twa: 0, speed: 0,
        },
        values: [],
      }

      let prevSpeed = 0;
      let prevTwa = 0;

      for (let twad = 0; twad <= 180; twad += interval) {
        const twa = degToRad(twad);

        let speed = getters['getSpeed'](ms, twa);
        curve.values.push({twa: twa, speed: speed});

        let vmgspeed = speedTowardsBearing(speed, twa, 0);
        if (vmgspeed > curve.maxvmg.up.vmg) {
          curve.maxvmg.up.vmg = vmgspeed;
          curve.maxvmg.up.twa = twa;
        }
        if (vmgspeed < curve.maxvmg.down.vmg) {
          curve.maxvmg.down.vmg = vmgspeed;
          curve.maxvmg.down.twa = twa;
        }
        if (speed > curve.maxspeed.speed) {
          curve.maxspeed.speed = speed;
          curve.maxspeed.twa = twa;
        }

        /* Refine maxvmg calculations */
        if (twad > 0) {
          let slope = polarSlope(prevTwa, prevSpeed, twa, speed);
          let dy0 = slopeDy(prevTwa, slope);
          let dy1 = slopeDy(twa, slope);
          let sign0 = Math.sign(dy0);
          let sign1 = Math.sign(dy1);

          if (sign0 !== 0 && sign0 !== 0 && sign0 !== sign1) {
            let zeroTwa = findZeroSlope(prevTwa, twa, slope);
            speed = getters['getSpeed'](ms, zeroTwa);
            vmgspeed = speedTowardsBearing(speed, zeroTwa, 0);
            if (vmgspeed > curve.maxvmg.up.vmg) {
              curve.maxvmg.up.vmg = vmgspeed;
              curve.maxvmg.up.twa = zeroTwa;
            }
            if (vmgspeed < curve.maxvmg.down.vmg) {
              curve.maxvmg.down.vmg = vmgspeed;
              curve.maxvmg.down.twa = zeroTwa;
            }
          }
        }
        prevSpeed = speed;
        prevTwa = twa;
      }

      return curve;
    },

    maxvmc: (state, getters) => (curve, absBearing, twd) => {
      const windAngleRaw = cogTwdToTwa(absBearing, twd);
      const windAngle = Math.abs(windAngleRaw);   /* Sign is fixed at the end */

      let startIdx = Math.round(windAngle / curve.interval);

      let res = {
        vmc: 0,
        twa: 0,
      };

      /* We start from the center (windAngle) and process to both directions
       * due to how the maxBs filter allows terminating as soon as it is no
       * longer possible to find larger values.
       */
      let idx = 0;
      while (true) {
        let thisIdx = startIdx + idx * (idx & 1 ? -1 : 1);
        if ((thisIdx < 0) || (thisIdx >= curve.values.length - 1)) {
          idx++;
          continue;
        }

        let values0 = curve.values[thisIdx];
        let values1 = curve.values[thisIdx + 1];

        /* Stop when even max is less than what we have so far */
        if (curve.maxspeed.speed * Math.cos(Math.abs(idx - 1) * curve.interval) < res.vmc) {
          break;
        }

        let vmcspeed = speedTowardsBearing(values0.speed, values0.twa, windAngle);
        if (vmcspeed > res.vmc) {
          res.vmc = vmcspeed;
          res.twa = values0.twa;
        }

        let slope = polarSlope(values0.twa - windAngle, values0.speed,
                               values1.twa - windAngle, values1.speed);
        let dy0 = slopeDy(values0.twa - windAngle, slope);
        let dy1 = slopeDy(values1.twa - windAngle, slope);
        let sign0 = Math.sign(dy0);
        let sign1 = Math.sign(dy1);
        if (sign0 !== 0 && sign0 !== 0 && sign0 !== sign1) {
          let zeroTwa = findZeroSlope(values0.twa - windAngle,
                                      values1.twa - windAngle, slope) + windAngle;
          let speed = getters['getSpeed'](curve.ms, zeroTwa);
          let vmcspeed = speedTowardsBearing(speed, zeroTwa, windAngle);
          if (vmcspeed > res.vmc) {
            res.vmc = vmcspeed;
            res.twa = zeroTwa;
          }
        }

        idx++;
      }

      res.twa = res.twa * (windAngleRaw < 0 ? -1 : 1);
      return res;
    },

    staticCurves: (state, getters) => {
      if (!state.loaded) {
        return [];
      }
      let res = [];
      let maxBs = 0;
      let prevCurve = null;
      for (let knots of getters.windKeys) {
        const curve = getters['curve'](knots)
        if ((knots <= 30) || (maxBs * 1.02 < state.maxBs.speed) ||
            (prevCurve !== null && diffCurves(prevCurve, curve) > 0.02)) {
          res.push(curve);
          prevCurve = curve;
        }
        maxBs = Math.max(maxBs, curve.maxspeed.speed);
      }
      return res;
    },
    currentCurve: (state, getters, rootState) => {
      if (rootState.boat.instruments.tws.value === null) {
        return null;
      }
      const knots = rootState.boat.instruments.tws.value * MS_TO_KNT;
      return getters['curve'](knots);
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

      polarData.max = {
        speed: 0,
        ms: 0,
        knots: 0,
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
        for (let j = 0; j < tmp.length; j++) {
          if (tmp[j] > polarData.max.speed) {
            polarData.max.speed = tmp[j];
            polarData.max.ms = polarData.twsval[j];
            polarData.max.knots = polarData.max.ms * MS_TO_KNT;
          }
        }
        bs.push(Object.freeze(tmp));
      }
      polarData.bs = Object.freeze(bs);
      commit('set', polarData);
    },
  },
}
