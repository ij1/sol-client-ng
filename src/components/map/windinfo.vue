<template>
  <l-control
    id = "wind-info"
    :position = "'topright'"
  >
    <div>
      {{ wrappedHoverLatLng | positionFormat }}
    </div>
    <div v-if = 'wxLoaded'>
      {{ wind }}
    </div>
    <div>
      {{ bearing }}
    </div>
  </l-control>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LControl } from 'vue2-leaflet';
import { radToDeg } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import { gcCalc } from '../../lib/nav.js';
import { EARTH_R } from '../../lib/sol.js';

export default {
  name: 'WindInfo',
  components: {
    'l-control': LControl,
  },
  filters: {
    positionFormat (value) {
      if (value === undefined) {
        return '';
      }
      return value === null ? '' : roundToFixed(value.lat, 6) + ',' + roundToFixed(value.lng, 6);
    },
  },
  computed: {
    wind () {
      if (this.wrappedHoverLatLng === null) {
        return '';
      }
      const wind = this.$store.getters['weather/latLngWind'](this.wrappedHoverLatLng);
      if (wind === undefined) {
        return '';
      }
      return roundToFixed(wind.knots, 2) + 'kn @' +
             roundToFixed(radToDeg(wind.twd), 2) + '\xb0';
    },
    bearing () {
      if (this.wrappedHoverLatLng === null) {
        return '';
      }
      if (this.boatPosition.equals(this.wrappedHoverLatLng)) {
        return '0nm';
      }
      const gcPath = gcCalc(this.boatPosition, this.wrappedHoverLatLng);

      return roundToFixed(gcPath.distance * EARTH_R / 1852, 3) + 'nm @' +
             roundToFixed(radToDeg(gcPath.startBearing), 2) + '\xb0 GC';
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      boatPosition: state => state.boat.position,
    }),
    ...mapGetters({
      wrappedHoverLatLng: 'map/wrappedHoverLatLng',
    }),
  },
}
</script>

<style scoped>
#wind-info {
  pointer-events: none;
  text-align: right;
}
</style>
