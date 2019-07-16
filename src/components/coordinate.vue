<template>
  <span>
    {{ latFormatted }}, {{lngFormatted}}
  </span>
</template>

<script>
import { roundToFixed } from '../lib/quirks.js';

export default {
  name: 'MapCoordinate',
  props: {
    latLng: {
      type: Object,
    }
  },
  computed: {
    precision () {
      return 5;
    },
    latFormatted () {
      if ((typeof this.latLng === 'undefined') || (this.latLng === null)) {
        return '';
      }
      return roundToFixed(this.latLng.lat, this.precision);
    },
    lngFormatted () {
      if ((typeof this.latLng === 'undefined') || (this.latLng === null)) {
        return '';
      }
      return roundToFixed(this.latLng.lng, this.precision);
    },
  }
}
</script>
