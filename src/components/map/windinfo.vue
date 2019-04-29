<template>
  <l-control
    id = "wind-info"
    :position = "'topright'"
    v-if = 'this.wxLoaded'
  >
    <div>
      {{ hoverLatLng | positionFormat }}
    </div>
    <div>
      {{ this.wind }}
    </div>
    <div>
      {{ this.bearing }}
    </div>
  </l-control>
</template>

<script>
import { mapState } from 'vuex';
import { LControl } from 'vue2-leaflet';
import { radToDeg, roundToFixed } from '../../lib/utils.js';
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
      if (this.hoverLatLng === null) {
        return '';
      }
      const wind = this.$store.getters['weather/latLngWind'](this.hoverLatLng);
      if (wind === undefined) {
        return '';
      }
      return roundToFixed(wind.knots, 2) + 'kn @' +
             roundToFixed(radToDeg(wind.twd), 2) + '\xb0';
    },
    bearing () {
      if (this.hoverLatLng === null) {
        return '';
      }
      if (this.boatPosition.equals(this.hoverLatLng)) {
        return '0nm';
      }
      const gcPath = gcCalc(this.boatPosition, this.hoverLatLng);

      return roundToFixed(gcPath.distance * EARTH_R / 1852, 3) + 'nm @' +
             roundToFixed(radToDeg(gcPath.startBearing), 2) + '\xb0 GC';
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      boatPosition: state => state.boat.position,
      hoverLatLng: state => state.map.hoverLatLng,
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
