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
import { radToDeg } from '../../lib/sol.js'

export default {
  name: 'WindInfo',
  components: {
    'l-control': LControl,
  },
  props: {
    map: {
      type: Object,
      required: true,
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
      return value === null ? '' : value.lat.toFixed(6) + ',' + value.lng.toFixed(6);
    },
  },
  computed: {
    wind () {
      if (this.latLng === null) {
        return '';
      }
      const wind = this.$store.getters['weather/latLngWind'](this.latLng);
      if (wind === undefined) {
        return '';
      }
      return wind.knots.toFixed(2) + 'kn @' + radToDeg(wind.twd).toFixed(2) + '\xb0';
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
  mounted () {
    this.map.on('mousemove', this.setPosition, this);
    this.map.on('mouseout', this.clearPosition, this);
  },
  beforeDestroy () {
    this.map.off('mousemove', this.setPosition);
    this.map.off('mousemout', this.clearPosition);
  },
}
</script>

<style scoped>
#wind-info {
  pointer-events: none;
  text-align: right;
}
</style>
