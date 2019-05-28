<template>
  <l-control
    id = "hover-info"
    :position = "'topright'"
  >
    <div>
      {{ wrappedHoverLatLng | positionFormat }}
    </div>
    <div v-if = 'boatPosition !== null'>
      {{ bearing }}
    </div>
    <div v-if = 'wxLoaded'>
      {{ wind }}
    </div>
  </l-control>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LControl } from 'vue2-leaflet';
import { radToDeg } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import { gcCalc, loxoCalc } from '../../lib/nav.js';
import { EARTH_R } from '../../lib/sol.js';

export default {
  name: 'HoverInfo',
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
      if ((this.wrappedHoverLatLng === null) ||
          (this.boatPosition === null)) {
        return '';
      }
      if (this.boatPosition.equals(this.wrappedHoverLatLng)) {
        return '0nm';
      }
      const path = this.cfgGcMode ?
                   gcCalc(this.boatPosition, this.wrappedHoverLatLng) :
                   loxoCalc(this.boatPosition, this.hoverLatLng);

      return roundToFixed(path.distance * EARTH_R / 1852, 3) + 'nm @' +
             roundToFixed(radToDeg(path.startBearing), 2) + '\xb0' +
             (this.cfgGcMode ? ' GC' : '');
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      boatPosition: state => state.boat.position,
      cfgGcMode: state => state.ui.cfg.gcMode.value,
      hoverLatLng: state => state.map.hoverLatLng,
    }),
    ...mapGetters({
      wrappedHoverLatLng: 'map/wrappedHoverLatLng',
    }),
  },
}
</script>

<style scoped>
#hover-info {
  pointer-events: none;
  text-align: right;
}
</style>
