<template>
  <div id="map-container">
    <l-map
      id="map"
      ref="map"
      :crs="PROJECTION"
      :zoom="initialZoom"
      :center="initialCenter"
      @update:center="updateCenter"
      @update:zoom="updateZoom"
      :world-copy-jump="true"
      :options="{attributionControl: false}"
    >
      <map-tiles v-if = "this.map !== null" :map = "this.map"/>
      <race-info v-if = "this.map !== null" :map = "this.map" :zoom="this.zoom"/>
      <race-info v-if = "this.map !== null" :map = "this.map" :zoom="this.zoom" :lng-offset = "-720"/>
      <race-info v-if = "this.map !== null" :map = "this.map" :zoom="this.zoom" :lng-offset = "-360"/>
      <race-info v-if = "this.map !== null" :map = "this.map" :zoom="this.zoom" :lng-offset = "360"/>
      <wind-info v-if = "this.map !== null" :hover-lat-lng = "this.hoverLatLng"/>
      <canvas-overlay v-if = "this.map !== null" :map = "this.map"/>
      <fleet-traces v-if = "this.map !== null"/>
      <fleet-map v-if = "this.map !== null" :map = "this.map"/>
      <fleet-hover v-if = "this.map !== null" :map = "this.map" :hover-lat-lng = "this.hoverLatLng"/>
      <player-boat v-if = "this.map !== null && this.boatPosition !== null" :course = "this.boatCourse" :twa = "this.boatTwa"/>
      <visual-steering v-if = "this.map !== null && this.visualSteeringEnabled" :map = "this.map" :hover-lat-lng = "this.hoverLatLng"/>
      <map-highlight v-if = "this.map !== null" :map = "this.map"/>
      <center-boat-button v-if = "this.map !== null"/>
      <steer-button v-if = "this.map !== null"/>
      <towback-flag v-if = "this.map !== null"/>
    </l-map>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet'
import { LMap, LCircleMarker, LMarker, LRectangle, LTooltip } from 'vue2-leaflet'
import { PROJECTION } from '../../lib/sol.js';

import MapTiles from './tiles';
import RaceInfo from './race';
import CanvasOverlay from './canvasoverlay';
import WindInfo from './windinfo';
import FleetTraces from './fleettraces';
import FleetMap from './fleetmap';
import FleetHover from './fleethover';
import PlayerBoat from './playerboat';
import VisualSteering from './visualsteering';
import MapHighlight from './highlight';
import CenterBoatButton from './centerboatbutton';
import SteerButton from './steerbutton';
import TowbackFlag from '../towbackflag';

export default {
  name: 'Map',
  components: {
    'l-map': LMap,
    'l-circle-marker': LCircleMarker,
    'l-marker': LMarker,
    'l-rectangle': LRectangle,
    'l-tooltip': LTooltip,
    'map-tiles': MapTiles,
    'race-info': RaceInfo,
    'canvas-overlay': CanvasOverlay,
    'wind-info': WindInfo,
    'fleet-traces': FleetTraces,
    'fleet-map': FleetMap,
    'fleet-hover': FleetHover,
    'player-boat': PlayerBoat,
    'visual-steering': VisualSteering,
    'map-highlight': MapHighlight,
    'center-boat-button': CenterBoatButton,
    'steer-button': SteerButton,
    'towback-flag': TowbackFlag,
  },

  data () {
    return {
      initialCenter: L.latLng(0, 0),
      initialZoom: 3,
      hoverLatLng: null,
      map: null,
      center: L.latLng(0, 0),
      zoom: 3,

      L: L,
      PROJECTION: PROJECTION,
    }
  },
  computed: {
    ...mapState({
      boatPosition: state => state.boat.position,
      boatCourse: state => state.boat.instruments.course.value,
      boatTwa: state => state.boat.instruments.twa.value,
      visualSteeringEnabled: state => state.boat.steering.visualSteering.enabled,
    }),
  },

  mounted() {
    this.$nextTick(() => {
      this.map = this.$refs.map.mapObject;
      this.map.on('mousemove', this.setHoverPos, this);
      this.map.on('mouseout', this.clearHoverPos, this);
    });
  },
  beforeDestroy () {
    // FIXME: is this racy with nextTick setups? Can we call with bogus values?
    this.map.off('mousemove', this.setHoverPos, this);
    this.map.off('mousemout', this.clearHoverPos, this);
  },

  methods: {
    updateZoom(zoom) {
      this.zoom = zoom;
    },
    updateCenter(center) {
      this.center = center;
    },
    setHoverPos (e) {
      /* For some reason it's not camel-cased in the event! */
      this.hoverLatLng = e.latlng.wrap();
    },
    clearHoverPos () {
      this.hoverLatLng = null;
    },
  }
}
</script>

<style scoped>
#mapcontainer {
  position: absolute;
  width: 100%;
  top: 0px;
  bottom: 0px;
}

#map {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 0;
}
</style>

<style>
@import '../../../node_modules/leaflet/dist/leaflet.css'
</style>

/* For now, put Leaflet global CSS defs here to avoid breaking CSS
 * Putting it to childs causes them to have no effect. Perhaps the
 * loading order w.r.t. leaflet.css is not correct if put to elsewhere
 * than here?
 */
<style>
.wp-tooltip {
  background: transparent;
  border: 0px;
  color: red;
  padding: 0px;
  padding-left: 5px;
  box-shadow: unset;
  text-align: left;
  line-height: 1.05;
}

.wp-tooltip::before {
  all: unset;
}

.steering-tooltip {
  text-align: left;
}
.steering-tooltip::before {
  all: unset;
}

.leaflet-container {
  background: #fff;
}
</style>
