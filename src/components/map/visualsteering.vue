<template>
  <l-layer-group>
    <sail-boat
      :lat-lng = "boatPosition"
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
        <div>
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
import { mapState } from 'vuex';
import { LLayerGroup, LCircle, LPolyline, LTooltip } from 'vue2-leaflet';
import { radToDeg, degToRad } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import { speedTowardsBearing, cogTwdToTwa, atan2Bearing } from '../../lib/nav.js';
import SailBoat from './sailboat';

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
      return (this.hoverLatLng !== null) ? this.hoverLatLng : this.boatPosition;
    },
    steerLine () {
      return [this.boatPosition, this.target];
    },
    cog () {
      return this.calcBearing(this.target).bearing;
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
      boatPosition: state => state.boat.position,
      twd: state => state.boat.instruments.twd.value,
      tws: state => state.boat.instruments.tws.value,
      showPolar: state => state.boat.steering.visualSteering.showPolar,
      hoverLatLng: state => state.map.hoverLatLng,
    }),
  },
  methods: {
    onClick (e) {
      const res = this.calcBearing(e.latlng);
      if (res.dx === 0 && res.dy === 0) {
        return;
      }
      this.$store.commit('boat/steering/setSteering', {
        type: 'cc',
        value: roundToFixed(radToDeg(res.bearing), 3),
      });
      this.map.off('click', this.onClick, this);
      this.$store.commit('boat/steering/visualSteeringOff');
    },
    calcBearing (target) {
      const z = this.map.getZoom();

      const targetProj = this.map.project(target, z).round();
      const boatProj = this.map.project(this.boatPosition, z).round();
      const dx = targetProj.x - boatProj.x;
      const dy = targetProj.y - boatProj.y;
      return {
        dx: dx,
        dy: dy,
        bearing: atan2Bearing(dx, dy),
      };
    }
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
