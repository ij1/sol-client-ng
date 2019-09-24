<template>
  <span>
    {{ latFormatted }}{{ separator }} {{ lngFormatted }}
  </span>
</template>

<script>
import { coordinateMixin } from './mixins/coordinate.js';

export default {
  name: 'MapCoordinate',
  mixins: [ coordinateMixin ],
  computed: {
    separator () {
      return this.signToHemisphere ? '' : ',';
    },
  },
}
</script>
