<template>
  <div id="map-container">
    <l-map
      id="map"
      ref="map"
      :crs="PROJECTION"
      :zoom="initialZoom"
      :center="initialCenter"
      @move="updateView"
      @moveend="updateView"
      @zoom="updateView"
      @zoomend="updateView"
      @resize="setSize"
      :world-copy-jump="true"
      :options="{
        zoomControl: false,
        attributionControl: false,
      }"
    >
      <map-tiles v-if = "this.map !== null" :map = "this.map"/>
      <race-info v-if = "this.map !== null" :map = "this.map"/>
      <race-info v-if = "this.map !== null" :map = "this.map" :lng-offset = "-720"/>
      <race-info v-if = "this.map !== null" :map = "this.map" :lng-offset = "-360"/>
      <race-info v-if = "this.map !== null" :map = "this.map" :lng-offset = "360"/>

      <canvas-overlay v-if = "this.map !== null" :map = "this.map"/>
      <fleet-traces v-if = "this.map !== null"/>
      <fleet-map v-if = "this.map !== null" :map = "this.map"/>
      <fleet-hover v-if = "this.map !== null" :map = "this.map"/>
      <player-boat v-if = "this.map !== null && this.boatPosition !== null" :course = "this.boatCourse" :twa = "this.boatTwa"/>
      <visual-steering v-if = "this.map !== null && this.visualSteeringEnabled" :map = "this.map"/>
      <map-highlight v-if = "this.map !== null" :map = "this.map"/>

      <race-status v-if = "this.map !== null"/>
      <l-control-zoom v-if = "this.map !== null" :position = "'topleft'" />
      <center-boat-button v-if = "this.map !== null"/>
      <steer-button v-if = "this.map !== null"/>
      <towback-flag v-if = "this.map !== null"/>

      <dc-bar v-if = "this.map !== null"/>
      <wind-info v-if = "this.map !== null"/>
      <map-scale v-if = "this.map !== null" :map = "this.map"/>
    </l-map>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { LMap, LCircleMarker, LMarker, LRectangle, LTooltip, LControlZoom } from 'vue2-leaflet';
import { PROJECTION } from '../../lib/sol.js';

import MapTiles from './tiles';
import RaceInfo from './race';
import CanvasOverlay from './canvasoverlay';

import FleetTraces from './fleettraces';
import FleetMap from './fleetmap';
import FleetHover from './fleethover';
import PlayerBoat from './playerboat';
import VisualSteering from './visualsteering';
import MapHighlight from './highlight';

import RaceStatus from '../racestatus.vue';
import CenterBoatButton from './centerboatbutton';
import SteerButton from './steerbutton';
import TowbackFlag from '../towbackflag';

import DcBar from '../dcbar.vue';
import WindInfo from './windinfo';
import MapScale from './scale.vue';

export default {
  name: 'Map',
  components: {
    'l-map': LMap,
    'l-circle-marker': LCircleMarker,
    'l-marker': LMarker,
    'l-rectangle': LRectangle,
    'l-tooltip': LTooltip,
    'l-control-zoom': LControlZoom,

    'map-tiles': MapTiles,
    'race-info': RaceInfo,
    'canvas-overlay': CanvasOverlay,

    'fleet-traces': FleetTraces,
    'fleet-map': FleetMap,
    'fleet-hover': FleetHover,
    'player-boat': PlayerBoat,
    'visual-steering': VisualSteering,
    'map-highlight': MapHighlight,

    'race-status': RaceStatus,
    'center-boat-button': CenterBoatButton,
    'steer-button': SteerButton,
    'towback-flag': TowbackFlag,

    'dc-bar': DcBar,
    'wind-info': WindInfo,
    'map-scale': MapScale,
  },

  data () {
    return {
      initialCenter: Object.assign({}, this.$store.state.map.center),
      initialZoom: this.$store.state.map.zoom,
      map: null,
      touched: false,

      L: L,
      PROJECTION: PROJECTION,
    }
  },
  computed: {
    ...mapState({
      raceLoaded: state => state.race.loaded,
      raceBoundary: state => state.race.boundary,
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
      this.updateView();
      this.setSize();
      this.touched = false;
    });
  },
  beforeDestroy () {
    // FIXME: is this racy with nextTick setups? Can we call with bogus values?
    this.map.off('mousemove', this.setHoverPos, this);
    this.map.off('mousemout', this.clearHoverPos, this);
  },

  methods: {
    updateView() {
      this.touched = true;
      this.$store.commit('map/setView', {
        center: this.map.getCenter(),
        zoom: this.map.getZoom(),
        bounds: this.map.getBounds(),
      });
    },
    setSize () {
      this.$store.commit('map/setSize', {
        size: this.map.getSize(),
        bounds: this.map.getBounds(),
      });
    },
    setHoverPos (e) {
      /* For some reason it's not camel-cased in the event! */
      this.$store.commit('map/setHover', e.latlng.wrap());
    },
    clearHoverPos () {
      this.$store.commit('map/setHover', null);
    },
  },

  watch: {
    raceLoaded (newValue, oldValue) {
      /* Don't force zoom when user has interacted with the view already */
      if (this.touched) {
        return;
      }
      if (this.map === null) {
        return;
      }
      if (newValue && !oldValue) {
        this.map.flyToBounds(this.raceBoundary);
      }
    }
  },
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
