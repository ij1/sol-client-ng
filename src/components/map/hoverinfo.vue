<template>
  <l-control
    id = "hover-info"
    :position = "'topright'"
  >
    <div>
      <map-coordinate :lat-lng = "wrappedHoverLatLng"/>
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
import { windToText } from '../../lib/weather.js';
import { gcCalc, loxoCalc, zeroPath } from '../../lib/nav.js';
import MapCoordinate from '../coordinate.vue';
import PathDistance from '../distance.vue';

export default {
  name: 'HoverInfo',
  components: {
    'l-control': LControl,
    'map-coordinate': MapCoordinate,
    'path-distance': PathDistance,
  },
  computed: {
    wind () {
      return windToText(this.hoverWind);
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
      hoverWind: 'map/hoverWind',
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
