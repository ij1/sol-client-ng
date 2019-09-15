<template>
  <div id="map-container">
    <l-map
      id="map"
      ref="map"
      :crs="PROJECTION"
      :zoom="initialZoom"
      :center="initialCenter"
      :max-zoom = "maxZoom"
      @move="updateView"
      @moveend="updateView"
      @zoom="updateView"
      @zoomend="updateView"
      @resize="setSize"
      :world-copy-jump="true"
      :options="{
        zoomControl: false,
        attributionControl: false,
        zoomSnap: 0.1,
        zoomDelta: 0.1,
        wheelPxPerZoomLevel: 120,
        doubleClickZoom: false,
        dragging: !L.Browser.mobile,
        touchZoom: true,
      }"
    >
      <map-tiles v-if = "map !== null" :map = "map"/>
      <time-of-day v-if = "map !== null"/>
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

      <div
        v-if = "showCursorAid"
        :style = "{top: mousePos.y + 'px'}"
        class = "aimline hline"
      />
      <div
        v-if = "showCursorAid"
        :style = "{left: mousePos.x + 'px'}"
        class = "aimline vline"
      />
    </l-map>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { LMap, LCircleMarker, LMarker, LRectangle, LTooltip } from 'vue2-leaflet';
import { EventBus } from '../../lib/event-bus.js';
import { PROJECTION } from '../../lib/sol.js';

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

export default {
  name: 'Map',
  components: {
    'l-map': LMap,
    'l-circle-marker': LCircleMarker,
    'l-marker': LMarker,
    'l-rectangle': LRectangle,
    'l-tooltip': LTooltip,

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
  },

  data () {
    return {
      initialCenter: Object.assign({}, this.$store.state.map.center),
      initialZoom: this.$store.state.map.zoom,
      map: null,

      mousePos: null,

      L: L,
      PROJECTION: PROJECTION,
    }
  },
  computed: {
    showCursorAid () {
      return (this.cfgCursorLines === 'normal') &&
             (this.mousePos !== null);
    },
    ...mapState({
      raceLoaded: state => state.race.loaded,
      raceBoundary: state => state.race.boundary,
      visualSteeringEnabled: state => state.boat.steering.visualSteering.enabled,
      rulerEnabled: state => state.ui.ruler.enabled,
      mapWrapList: state => state.map.wrapList,
      cfgCursorLines: state => state.ui.cfg.cursorLines.value,
    }),
    ...mapGetters({
      mapMinWrap: 'map/mapMinWrap',
      mapMaxWrap: 'map/mapMaxWrap',
      inDefaultUiMode: 'ui/inDefaultUiMode',
      maxZoom: 'map/maxZoom',
    }),
  },

  mounted() {
    this.$nextTick(() => {
      this.map = this.$refs.map.mapObject;
      this.map.createPane('timeofdayPane');
      this.map.getPane('timeofdayPane').style.zIndex = 300;
      this.map.on('mousemove', this.setHoverPos, this);
      this.map.on('mouseout', this.clearHoverPos, this);
      this.updateView();
      this.setSize();
      EventBus.$on('right-pane-resize', this.forceResize);
    });
  },
  beforeDestroy () {
    // FIXME: is this racy with nextTick setups? Can we call with bogus values?
    this.map.off('mousemove', this.setHoverPos, this);
    this.map.off('mousemout', this.clearHoverPos, this);
    EventBus.$off('right-pane-resize', this.forceResize);
  },

  methods: {
    tripleBounds (size) {
      return L.latLngBounds(
        this.map.containerPointToLatLng(L.point(-size.x, -size.y)),
        this.map.containerPointToLatLng(L.point(size.x * 2, size.y * 2))
      );
    },
    updateView() {
      const center = this.map.getCenter();
      this.$store.commit('map/setView', {
        center: center,
        zoom: this.map.getZoom(),
        bounds: this.map.getBounds(),
        tripleBounds: this.tripleBounds(this.map.getSize()),
      });
      this.$store.commit('boat/updateLngOffset', center.lng);
      this.updateWrapList();
      if (this.mousePos !== null) {
        this.$store.commit('map/setHover',
                           this.map.containerPointToLatLng(this.mousePos));
      }
    },
    setSize () {
      const size = this.map.getSize();
      this.$store.commit('map/setSize', {
        size: size,
        bounds: this.map.getBounds(),
        tripleBounds: this.tripleBounds(size),
      });
      this.updateWrapList();
    },
    forceResize () {
      this.map.invalidateSize({pan: false});
    },
    /* Sadly a vuex getter fires unnecessarily even if its dependencies
     * values did not change so workaround it
     */
    updateWrapList () {
      if ((this.mapWrapList[0] !== this.mapMinWrap - 360) ||
          (this.mapWrapList[this.mapWrapList.length - 1] !== this.mapMaxWrap + 360)) {
        let wrapList = [];
        for (let i = this.mapMinWrap - 360; i <= this.mapMaxWrap + 360; i += 360) {
          wrapList.push(i);
        }
        this.$store.commit('map/setWrapList', wrapList);
      }
    },
    setHoverPos (e) {
      /* For some reason it's not camel-cased in the event! */
      this.$store.commit('map/setHover', e.latlng);
      this.mousePos = e.containerPoint;
    },
    clearHoverPos () {
      this.$store.commit('map/setHover', null);
      this.mousePos = null;
    },
  },

  watch: {
    raceLoaded (newValue, oldValue) {
      if (this.map === null) {
        return;
      }
      if (newValue && !oldValue) {
        this.$nextTick(() => {
          this.map.flyToBounds(this.raceBoundary);
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
.steering-tooltip::before {
  all: unset;
}

.leaflet-popup-pane {
  mix-blend-mode: multiply;
}
.leaflet-popup-content-wrapper, .leaflet-popup-tip {
  background: #ddd;
}
.leaflet-container a.leaflet-popup-close-button {
  color: #333;
}
.leaflet-container a.leaflet-popup-close-button:hover {
  color: #000;
}
.leaflet-popup-content {
  color: #333;
  font-weight: bold;
}

.ruler-line-tooltip {
  background: transparent;
  border: 0px;
  color: black;
  padding: 0px;
  box-shadow: unset;
  line-height: 1.05;
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

.leaflet-top {
  mix-blend-mode: multiply;
}

.tool-button {
  padding: 5px;
  border: 1px solid rgb(48, 48, 48, 0.6);
  border-radius: 3px;
  background-color: #ddd;
  font-weight: bold;
  overflow: hidden;
  cursor: auto;
}

.aimline {
  position: absolute;
  background: #ddd;
  mix-blend-mode: multiply;
  z-index: 999;
  pointer-events: none;
}

.hline {
  width: 100%;
  height: 1px;
}

.vline {
  width: 1px;
  height: 100%;
}
</style>
