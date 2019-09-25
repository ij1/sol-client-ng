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
import { distanceMixin } from './mixins/distance.js';

export default {
  name: 'PathDistance',
  mixins: [distanceMixin],
  props: {
    path: {
      type: Object,
    }
  },
  filters: {
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
