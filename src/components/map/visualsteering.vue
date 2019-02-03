<template>
  <l-layer-group v-if = "this.visualSteeringEnabled">
    <player-boat
      :scale = "3"
      :color = "this.color"
      :course = "this.cog"
      :twa = "this.twa"
      :stroke-width = "1"
    />
    <l-polyline
      :lat-lngs = "this.steerLine"
      :color = "this.color"
      :weight = "1"
      :fill = "false"
    />
    <l-circle
      v-if = "this.hoverLatLng !== null"
      :lat-lng = "this.target"
      :color = "this.color"
      :radius = "0"
      :weight = "1"
      :fill = "false"
    >
      <l-tooltip :options = "this.tooltipOptions">
        <div>
          <div>COG: {{this.cog | formatAngle }}</div>
          <div>TWA: {{this.twa | formatAngle }}</div>
          <div>SOG: {{this.sog | formatValue }}</div>
          <div>VMG: {{this.vmg | formatValue }}</div>
        </div>
      </l-tooltip>
    </l-circle>
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup, LCircle, LPolyline, LTooltip } from 'vue2-leaflet';
import { radToDeg, degToRad } from '../../lib/utils.js';
import { speedTowardsBearing, cogTwdToTwa, atan2Bearing } from '../../lib/nav.js';
import PlayerBoat from './playerboat';

export default {
  name: 'VisualSteering', 
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle': LCircle,
    'l-polyline': LPolyline,
    'l-tooltip': LTooltip,
    'player-boat': PlayerBoat,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
    hoverLatLng: {
      type: Object,
    },
  },
  filters: {
    formatAngle (value) {
      return radToDeg(value).toFixed(3);
    },
    formatValue (value) {
      return value.toFixed(3);
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
      const z = this.map.getZoom();

      const targetProj = this.map.project(this.target, z).round();
      const boatProj = this.map.project(this.boatPosition, z).round();
      
      return atan2Bearing(targetProj.x - boatProj.x,
                          -(targetProj.y - boatProj.y));
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
      visualSteeringEnabled: state => state.boat.steering.visualSteering.enabled,
      showPolar: state => state.boat.steering.visualSteering.showPolar,
    }),
  },
}
</script>
