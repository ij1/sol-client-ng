<template>
  <l-layer-group>
    <sail-boat
      :lat-lng = "visualPosition"
      :scale = "3"
      :color = "color"
      :course = "cog"
      :twa = "twa"
      :stroke-width = "1"
    />
    <l-polyline
      :lat-lngs = "steerLine"
      :color = "color"
      :weight = "1"
      :fill = "false"
    />
    <l-circle
      v-if = "hoverLatLng !== null"
      :lat-lng = "target"
      :color = "color"
      :radius = "0"
      :weight = "1"
      :fill = "false"
    >
      <l-tooltip :options = "tooltipOptions">
        <div id = "visual-steering-info">
          <div>COG: {{cog | formatAngle }}</div>
          <div>TWA: {{twa | formatAngle }}</div>
          <div>SOG: {{sog | formatValue }}</div>
          <div>VMG: {{vmg | formatValue }}</div>
        </div>
      </l-tooltip>
    </l-circle>
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup, LCircle, LPolyline, LTooltip } from 'vue2-leaflet';
import { radToDeg, degToRad } from '../../../lib/utils.js';
import { roundToFixed } from '../../../lib/quirks.js';
import { speedTowardsBearing, cogTwdToTwa, loxoCalc, pixelDistanceCalc } from '../../../lib/nav.js';
import SailBoat from '../sailboat.vue';

export default {
  name: 'VisualSteering', 
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle': LCircle,
    'l-polyline': LPolyline,
    'l-tooltip': LTooltip,
    'sail-boat': SailBoat,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      minSteeringDistance: 3,
    }
  },
  filters: {
    formatAngle (value) {
      return roundToFixed(radToDeg(value), 3);
    },
    formatValue (value) {
      return roundToFixed(value, 3);
    },
  },
  computed: {
    target () {
      if ((this.hoverLatLng === null) ||
          (this.minPixelDistance(this.hoverLatLng) < this.minSteeringDistance)) {
        return this.visualPosition;
      }
      return this.hoverLatLng;
    },
    steerLine () {
      return [this.visualPosition, this.target];
    },
    cog () {
      return loxoCalc(this.visualPosition, this.target).startBearing;
    },
    twa () {
      return cogTwdToTwa(this.cog, this.twd);
    },
    sog () {
      return this.$store.getters['boat/polar/getSpeed'](this.tws, this.twa);
    },
    vmg () {
      return speedTowardsBearing(this.sog, this.twa, 0);
    },
    color () {
      return this.twa >= 0 ? '#00ff00' : '#ff0000';
    },
    tooltipOptions () {
      return {
        permanent: true,
        direction: (this.cog >= degToRad(180)) ? 'left' : 'right',
        className: 'steering-tooltip',
      }
    },
    ...mapState({
      twd: state => state.boat.instruments.twd.value,
      tws: state => state.boat.instruments.tws.value,
      showPolar: state => state.boat.steering.visualSteering.showPolar,
      hoverLatLng: state => state.map.hoverLatLng,
      zoom: state => state.map.zoom,
    }),
    ...mapGetters({
      visualPosition: 'boat/visualPosition',
    }),
  },
  methods: {
    onClick (e) {
      const res = loxoCalc(this.visualPosition, e.latlng);
      if (this.minPixelDistance(e.latlng) < this.minSteeringDistance) {
        return;
      }
      this.$store.commit('boat/steering/setSteering', {
        type: 'cc',
        value: roundToFixed(radToDeg(res.startBearing), 3),
      });
      this.map.off('click', this.onClick, this);
      this.$store.dispatch('ui/cancelUiMode');
    },
    minPixelDistance (latLng) {
      const pxDst = pixelDistanceCalc(this.visualPosition, latLng, this.zoom);
      return Math.min(Math.abs(pxDst.dx), Math.abs(pxDst.dy));
    },
  },
  mounted () {
    this.map.on('click', this.onClick, this);
  },
  beforeDestroy () {
    this.map.off('click', this.onClick, this);
  },
  watch: {
    twa (val) {
      if (this.hoverLatLng === null) {
        val = null;
      }
      this.$store.commit('boat/steering/visualSteeringSetTwa', val);
    }
  },
}
</script>

<style scoped>
#visual-steering-info {
  font-size: 12px;
}
</style>
