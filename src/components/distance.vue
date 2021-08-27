<template>
  <span>
    {{formatDistance(path.distance)}}nm
    <span v-if = "path.startBearing !== null">
      @{{formatBearing(path.startBearing) }}&deg;
      {{formatNavMode(path.navMode)}}
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
  methods: {
    formatBearing (value) {
      return roundToFixed(radToDeg(value), 2);
    },
    formatNavMode (value) {
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
