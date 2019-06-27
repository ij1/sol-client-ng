<template>
  <l-control
    id = "hover-info"
    :position = "'topright'"
  >
    <div>
      {{ wrappedHoverLatLng | positionFormat }}
    </div>
    <path-distance v-if = 'path !== null' :path = "path"/>
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
import { gcCalc, loxoCalc, zeroPath } from '../../lib/nav.js';
import PathDistance from '../distance.vue';

export default {
  name: 'HoverInfo',
  components: {
    'l-control': LControl,
    'path-distance': PathDistance,
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
    path () {
      if ((this.wrappedHoverLatLng === null) ||
          (this.boatPosition === null)) {
        return null;
      }
      if (this.boatPosition.equals(this.wrappedHoverLatLng)) {
        return zeroPath;
      }
      return this.cfgGcMode ?
        gcCalc(this.boatPosition, this.wrappedHoverLatLng) :
        loxoCalc(this.boatPosition, this.hoverLatLng);
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
  font-size: 12px;
}
</style>
