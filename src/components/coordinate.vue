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
    latFormatted () {
      if ((typeof this.latLng === 'undefined') || (this.latLng === null)) {
        return '';
      }
      return roundToFixed(this.latLng.lat, 6);
    },
    lngFormatted () {
      if ((typeof this.latLng === 'undefined') || (this.latLng === null)) {
        return '';
      }
      return roundToFixed(this.latLng.lng, 6);

    },
  }
}
</script>
