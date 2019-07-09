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
    ...mapState({
      raceLoaded: state => state.race.loaded,
      raceBoundary: state => state.race.boundary,
      visualSteeringEnabled: state => state.boat.steering.visualSteering.enabled,
      rulerEnabled: state => state.ui.ruler.enabled,
      mapWrapList: state => state.map.wrapList,
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
      this.map.on('dblclick', this.onDblClick, this);
      this.updateView();
      this.setSize();
      EventBus.$on('right-pane-resize', this.forceResize);
    });
  },
  beforeDestroy () {
    // FIXME: is this racy with nextTick setups? Can we call with bogus values?
    this.map.off('mousemove', this.setHoverPos, this);
    this.map.off('mousemout', this.clearHoverPos, this);
    if (this.inDefaultUiMode) {
      this.map.off('dblclick', this.onDblClick, this);
    }
    EventBus.$off('right-pane-resize', this.forceResize);
  },

  methods: {
    updateView() {
      const center = this.map.getCenter();
      this.$store.commit('map/setView', {
        center: center,
        zoom: this.map.getZoom(),
        bounds: this.map.getBounds(),
      });
      this.$store.commit('boat/updateLngOffset', center.lng);
      this.updateWrapList();
      if (this.mousePos !== null) {
        this.$store.commit('map/setHover',
                           this.map.containerPointToLatLng(this.mousePos));
      }
    },
    setSize () {
      this.$store.commit('map/setSize', {
        size: this.map.getSize(),
        bounds: this.map.getBounds(),
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
    onDblClick (e) {
      if (this.inDefaultUiMode) {
        this.map.panTo(e.latlng);
      }
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
    inDefaultUiMode (newValue, oldValue) {
      if (newValue === oldValue) {
        return;
      }
      if (newValue) {
        // ADDME: fix races here vs beforeDestroyed
        setTimeout(() => {
          this.map.on('dblclick', this.onDblClick, this);
        }, 0);
      } else {
        this.map.off('dblclick', this.onDblClick, this);
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

.pr-tooltip {
  color: #ff00ff;
}

.steering-tooltip {
  text-align: left;
}
.steering-tooltip::before {
  all: unset;
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

.tool-button {
  padding: 5px;
  border: 1px solid rgb(48, 48, 48, 0.6);
  border-radius: 3px;
  background-color: rgb(255, 255, 255, 0.6);
  font-weight: bold;
  overflow: hidden;
}
</style>
