<template>
  <div id="map-container">
    <l-map
      id="map"
      ref="map"
      :crs="L.CRS.EPSG3395"
      :zoom="zoom"
      :center="center"
      @update:center="updateCenter"
      @update:zoom="updateZoom"
      :worldCopyJump="true"
    >
      <map-tiles v-if = "this.map !== null" :map = "this.map"/>
      <race-info v-if = "this.map !== null"/>
      <race-info v-if = "this.map !== null" :lngOffset = "-720"/>
      <race-info v-if = "this.map !== null" :lngOffset = "-360"/>
      <race-info v-if = "this.map !== null" :lngOffset = "360"/>
      <wind-info v-if = "this.map !== null" :map = "this.map"/>
      <wind-map v-if = "this.map !== null" :map = "this.map"/>
      <fleet-map v-if = "this.map !== null" :map = "this.map"/>
      <player-boat v-if = "this.map !== null"/>
      <map-highlight v-if = "this.map !== null" :map = "this.map"/>
      <to-boat v-if = "this.map !== null" :map = "this.map"/>
      <towback-flag v-if = "this.map !== null"/>
    </l-map>
  </div>
</template>

<script>
import L from 'leaflet'
import { LMap, LCircleMarker, LMarker, LRectangle, LTooltip } from 'vue2-leaflet'

import MapTiles from './tiles';
import RaceInfo from './race';
import WindMap from './wind';
import WindInfo from './windinfo';
import FleetMap from './fleet';
import PlayerBoat from './playerboat';
import MapHighlight from './highlight';
import ToBoatButton from './toboat';
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
    'wind-map': WindMap,
    'wind-info': WindInfo,
    'fleet-map': FleetMap,
    'player-boat': PlayerBoat,
    'map-highlight': MapHighlight,
    'to-boat': ToBoatButton,
    'towback-flag': TowbackFlag,
  },

  data () {
    return {
      center: L.latLng(0, 0),
      zoom: 3,
      map: null,
      currentCenter: L.latLng(0, 0),
      currentZoom: 3,

      L: L,
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.map = this.$refs.map.mapObject;
    });
  },

  methods: {
    updateZoom(zoom) {
      this.currentZoom = zoom;
    },
    updateCenter(center) {
      this.currentCenter = center;
    }
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
}

.wp-tooltip::before {
  all: unset;
}
</style>