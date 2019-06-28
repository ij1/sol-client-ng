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
      return roundToFixed(value * EARTH_R / 1852, 3);
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
