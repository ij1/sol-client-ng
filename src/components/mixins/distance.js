import { roundToFixed } from '../../lib/quirks.js';
import { EARTH_R } from '../../lib/sol.js';

export let distanceMixin = {
  methods: {
    formatDistance (value) {
      let decimals = 3;
      let nm = value * EARTH_R / 1852;
      if (nm >= 1000) {
        decimals = 0;
      } else if (nm >= 100) {
        decimals = 1;
      } else if (nm >= 10) {
        decimals = 2;
      }
      return roundToFixed(nm, decimals);
    },
  },
}
