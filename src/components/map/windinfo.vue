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
import { radToDeg } from '../../lib/utils.js';
import { gcCalc } from '../../lib/nav.js';

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
      return value === null ? '' : value.lat.toFixed(6) + ',' + value.lng.toFixed(6);
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
      return wind.knots.toFixed(2) + 'kn @' + radToDeg(wind.twd).toFixed(2) + '\xb0';
    },
    bearing () {
      if (this.hoverLatLng === null) {
        return '';
      }
      const gcPath = gcCalc(this.boatPosition, this.hoverLatLng);

      return (radToDeg(gcPath.distance) * 60).toFixed(3) + 'nm @' +
             radToDeg(gcPath.startBearing).toFixed(2) + '\xb0 GC';
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
