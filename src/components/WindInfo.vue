<template>
  <l-control
    id = "wind-info"
    :position = "'topright'"
    v-if = 'this.$store.state.weather.loaded'
  >
    <div>
      {{ latLng | positionFormat }}
    </div>
    <div>
      {{ this.wind }}
    </div>
  </l-control>
</template>

<script>
import { LControl } from 'vue2-leaflet'
import { UVtoTwdTws, radToDeg, KNT_MS } from '../lib/sol.js'

export default {
  name: 'WindInfo',
  components: {
    'l-control': LControl,
  },
  props: {
    map: {
      type: Object,
    }
  },
  data () {
    return {
      latLng: null,
    }
  },
  filters: {
    positionFormat (value) {
      if (value === undefined) {
        return '';
      }
      return value === null ? '' : value.lat + ',' + value.lng;
    },
  },
  // Add beforeDestroy
  computed: {
    wind () {
      if (this.latLng === null) {
        return '';
      }
      const uv = this.$store.getters['weather/interpolateLatLng'](this.latLng);
      if (uv === undefined) {
        return '';
      }
      const tw = UVtoTwdTws(uv);
      return (tw[1] * KNT_MS).toFixed(2) + 'kn @' + (radToDeg(tw[0])).toFixed(2) + '\xb0';
    },
  },
  methods: {
    setPosition (e) {
      /* For some reason it's not camel-cased in the event! */
      this.latLng = e.latlng;
    },
    clearPosition () {
      this.latLng = null;
    },
  },
  watch: {
    map () {
      this.map.on('mousemove', this.setPosition, this);
      this.map.on('mouseout', this.clearPosition, this);
    }
  }
}
</script>

<style scoped>
#wind-info {
  pointer-events: none;
}
</style>
