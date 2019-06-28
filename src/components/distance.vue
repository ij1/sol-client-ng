<template>
  <span>
    {{path.distance | distance}}nm
    <span v-if = "path.startBearing !== null">
      @{{path.startBearing | bearing }}&deg;
      {{path.navMode | navMode}}
    </span>
  </span>
</template>

<script>
import { radToDeg } from '../lib/utils.js';
import { roundToFixed } from '../lib/quirks.js';
import { EARTH_R } from '../lib/sol.js';

export default {
  name: 'PathDistance',
  props: {
    path: {
      type: Object,
    }
  },
  filters: {
    distance (value) {
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
    bearing (value) {
      return roundToFixed(radToDeg(value), 2);
    },
    navMode (value) {
      if (value === 'ortho') {
        return 'GC';
      }
      if (value === 'loxo') {
        return 'Rh';
      }
      return '';
    }
  },
}
</script>
