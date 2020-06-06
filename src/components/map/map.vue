<template>
  <div id="map-container">
    <l-map
      id="map"
      ref="map"
      :crs="PROJECTION"
      :zoom="initialZoom"
      :center="initialCenter"
      :min-zoom = "minZoom"
      :max-zoom = "maxZoom"
      @resize="setSize"
      :world-copy-jump="true"
      :options="{
        zoomControl: false,
        attributionControl: false,
        zoomSnap: zoomStep,
        zoomDelta: zoomStep,
        wheelPxPerZoomLevel: 120,
        doubleClickZoom: false,
        dragging: !L.Browser.mobile,
        touchZoom: true,
      }"
    >
      <map-tiles v-if = "map !== null" :map = "map"/>
      <time-of-day v-if = "map !== null" :map = "map"/>
      <race-info v-if = "map !== null"/>
      <pr-marks v-if = "map !== null"/>

      <canvas-overlay v-if = "map !== null" :map = "map"/>
      <fleet-traces v-if = "map !== null"/>
      <fleet-map v-if = "map !== null" :map = "map"/>
      <player-boat v-if = "map !== null"/>

      <default-ui-mode v-if = "map !== null && inDefaultUiMode" :map = "map"/>
      <map-pois v-if = "map !== null"/>
      <visual-steering v-if = "map !== null && visualSteeringEnabled" :map = "map"/>
      <ruler-paths v-if = "map !== null"/>
      <ruler-tool v-if = "map !== null && rulerEnabled" :map = "map"/>

      <map-highlight v-if = "map !== null" :map = "map"/>

      <race-status v-if = "map !== null"/>
      <zoom-in-button v-if = "map !== null" :map = "map"/>
      <zoom-out-button v-if = "map !== null" :map = "map"/>
      <center-boat-button v-if = "map !== null"/>
      <steer-button v-if = "map !== null"/>
      <ruler-button v-if = "map !== null"/>
      <towback-flag v-if = "map !== null"/>

      <dc-bar v-if = "map !== null"/>
      <hover-info v-if = "map !== null"/>

      <map-scale v-if = "map !== null" :map = "map"/>
      <fleet-hover v-if = "map !== null" :map = "map"/>
      <fleet-legend v-if = "map !== null"/>
      <boat-name-tips v-if = "map !== null"/>

      <quick-access-buttons v-if = "map !== null"/>

      <map-cursor v-if = "map !== null" :map = "map"/>
    </l-map>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { LMap } from 'vue2-leaflet';
import { EventBus } from '../../lib/event-bus.js';
import { PROJECTION } from '../../lib/sol.js';
import { tripleBounds } from '../../lib/utils.js';

import MapTiles from './tiles';
import TimeOfDay from './timeofday.vue'
import RaceInfo from './race';
import PrMarks from './prmarks';
import CanvasOverlay from './canvasoverlay';

import FleetTraces from './fleettraces';
import FleetMap from './fleetmap';
import FleetHover from './fleethover';
import PlayerBoat from './playerboat';

import DefaultUiMode from './defaultuimode.vue';
import MapPois from './tools/pois.vue';
import VisualSteering from './tools/visualsteering';
import RulerPaths from './tools/rulerpaths';
import RulerTool from './tools/rulertool';

import MapHighlight from './highlight';

import RaceStatus from '../racestatus.vue';
import ZoomInButton from './buttons/zoominbutton.vue';
import ZoomOutButton from './buttons/zoomoutbutton.vue';
import CenterBoatButton from './buttons/centerboatbutton';
import SteerButton from './buttons/steerbutton';
import RulerButton from './buttons/rulerbutton';
import TowbackFlag from '../towbackflag';

import DcBar from '../dcbar.vue';
import HoverInfo from './hoverinfo';
import MapScale from './scale.vue';
import FleetLegend from './fleetlegend.vue';
import BoatnameTips from './boatnametips.vue';
import QuickAccessButtons from './buttons/quickaccess.vue';

import MapCursor from './cursor.vue';

export default {
  name: 'Map',
  components: {
    'l-map': LMap,

    'map-tiles': MapTiles,
    'time-of-day': TimeOfDay,
    'race-info': RaceInfo,
    'pr-marks': PrMarks,
    'canvas-overlay': CanvasOverlay,

    'fleet-traces': FleetTraces,
    'fleet-map': FleetMap,
    'fleet-hover': FleetHover,
    'player-boat': PlayerBoat,

    'default-ui-mode': DefaultUiMode,
    'map-pois': MapPois,
    'visual-steering': VisualSteering,
    'ruler-paths': RulerPaths,
    'ruler-tool': RulerTool,

    'map-highlight': MapHighlight,

    'race-status': RaceStatus,
    'zoom-in-button': ZoomInButton,
    'zoom-out-button': ZoomOutButton,
    'center-boat-button': CenterBoatButton,
    'steer-button': SteerButton,
    'ruler-button': RulerButton,
    'towback-flag': TowbackFlag,

    'dc-bar': DcBar,
    'hover-info': HoverInfo,
    'map-scale': MapScale,
    'fleet-legend': FleetLegend,
    'boat-name-tips': BoatnameTips,
    'quick-access-buttons': QuickAccessButtons,

    'map-cursor': MapCursor,
  },

  data () {
    return {
      initialCenter: Object.assign({}, this.$store.state.map.center),
      initialZoom: this.$store.state.map.zoom,
      map: null,

      L: L,
      PROJECTION: PROJECTION,
    }
  },
  computed: {
    ...mapState({
      boatLoaded: state => state.boat.id,
      raceBoundary: state => state.race.boundary,
      raceFinish: state => state.race.finish,
      raceRoute: state => state.race.route,
      visualSteeringEnabled: state => state.boat.steering.visualSteering.enabled,
      rulerEnabled: state => state.ui.ruler.enabled,
      zoomStep: state => state.map.zoomStep,
      lastRoundedMark: state => state.boat.lastRoundedMark,
      boatPosition: state => state.boat.position,
    }),
    ...mapGetters({
      inDefaultUiMode: 'ui/inDefaultUiMode',
      minZoom: 'map/minZoom',
      maxZoom: 'map/maxZoom',
      publicBoat: 'boat/publicBoat',
    }),
  },

  mounted() {
    this.$nextTick(() => {
      this.map = this.$refs.map.mapObject;
      this.$store.commit('map/setMap', this.map);
      this.setSize();
      EventBus.$on('right-pane-resize', this.forceResize);
    });
  },
  beforeDestroy () {
    EventBus.$off('right-pane-resize', this.forceResize);
  },

  methods: {
    setSize () {
      const size = this.map.getSize();
      this.$store.commit('map/setView', {
        center: this.map.getCenter(),
        zoom: this.map.getZoom(),
        size: size,
        bounds: this.map.getBounds(),
        tripleBounds: tripleBounds(this.map, size),
      });
    },
    forceResize () {
      this.map.invalidateSize({pan: false});
    },

    remainingRouteBounds () {
      let res = [this.raceFinish[0], this.raceFinish[1]];
      let i = 0;
      if (!this.publicBoat) {
        i = this.lastRoundedMark + 1;
        res.push(this.boatPosition);
      }
      while (i < this.raceRoute.length) {
        res.push(this.raceRoute[i].latLng);
        i++;
      }
      return L.latLngBounds(res);
    },
  },

  watch: {
    boatLoaded (newValue, oldValue) {
      if (this.map === null) {
        return;
      }
      if (newValue !== null && oldValue === null) {
        this.$nextTick(() => {
          const bounds = this.remainingRouteBounds().pad(0.3);
          this.map.flyToBounds(bounds, { maxZoom: 12 });
        });
      }
    },
  },
}
</script>

<style scoped>
#map-container {
  cursor: crosshair;
}

#map {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 0;
}
</style>

<style>
@import url(~leaflet/dist/leaflet.css)
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

.pr-tooltip {
  color: #ff00ff;
}

.steering-tooltip {
  text-align: left;
}
.time-of-day-white .steering-tooltip {
  color: #000;
  background-color: #ddd;
}
.time-of-day-dark .steering-tooltip {
  color: #0f0;
  background-color: #333;
  border-color: #0f0;
}
.steering-tooltip::before {
  all: unset;
}

.leaflet-popup-content-wrapper, .leaflet-popup-tip {
  background: unset;
  color: unset;
}

.ruler-line-tooltip {
  background: transparent;
  border: 0px;
  padding: 0px;
  box-shadow: unset;
  line-height: 1.05;
}
.time-of-day-white .ruler-line-tooltip {
  color: #000;
}
.time-of-day-dark .ruler-line-tooltip {
  color: #0f0;
}

.ruler-line-tooltip::before {
  all: unset;
}

.ruler-line-tooltip-right {
  padding-left: 5px;
  text-align: left;
}

.ruler-line-tooltip-bottom {
  padding-top: 5px;
  text-align: center;
}

.leaflet-container {
  background: #fff;
  cursor: crosshair;
}

.leaflet-interactive {
  cursor: crosshair;
}

.time-of-day-white .leaflet-top,
.time-of-day-white .leaflet-right {
  mix-blend-mode: multiply;
}
.time-of-day-dark .leaflet-top,
.time-of-day-dark .leaflet-right {
  mix-blend-mode: unset;
}

.tool-button {
  padding: 5px;
  border-radius: 3px;
  font-weight: bold;
  overflow: hidden;
  cursor: auto;
  user-select: none;
}
.time-of-day-white .tool-button,
.time-of-day-white .tool-button {
  border: 1px solid rgba(48, 48, 48, 0.6);
  background-color: #ddd;
  color: #000;
}
.time-of-day-dark .tool-button,
.time-of-day-dark .tool-button {
  border: 1px solid rgba(0, 200, 0, 0.6);
  background: rgba(60, 60, 60, 0.8);
  color: #0f0;
}
.tool-button-enabled {
  color: #f00 !important;
}
.tool-button-disabled {
  color: rgba(96, 96, 96, 0.6) !important;
}
</style>
