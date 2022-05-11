<template>
  <span>
    {{ latFormatted }}{{ separator }} {{ lngFormatted }}
  </span>
</template>

<script>
import { mapGetters } from 'vuex';
import { coordinateMixin } from './mixins/coordinate.js';

export default {
  name: 'MapCoordinate',
  mixins: [ coordinateMixin ],
  computed: {
    separator () {
      return this.signToHemisphere ? '' : ',';
    },
    ...mapGetters({
      signToHemisphere: 'ui/coordinateSignToHemisphere',
    }),
  },
}
</script>
