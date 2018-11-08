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
      <map-tiles
        v-if = "this.map !== null"
        :map = "this.map"
      />
      <race-info
        v-if = "this.map !== null"
        :map = "this.map"
      />
      <l-marker
        v-if = "this.$store.state.boat.position !== null"
        :latLng="this.$store.state.boat.position"
        :icon="myBoatIcon"
      />
      <wind-info
        v-if = "this.map !== null"
        :map = "this.map"
      />
      <wind-map
        v-if = "this.map !== null"
        :map = "this.map"
      />

      <to-boat
        v-if = "this.map !== null"
        :map = "this.map"
      />
    </l-map>
  </div>
</template>

<script>
import L from 'leaflet'
import { LMap, LCircleMarker, LMarker, LRectangle, LTooltip } from 'vue2-leaflet'

import MapTiles from './tiles';
import RaceInfo from './race';
import WindInfo from './windinfo'
import WindMap from './wind'
import ToBoatButton from './toboat';
import { radToDeg } from '../../lib/utils.js';

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
    'wind-info': WindInfo,
    'wind-map': WindMap,
    'to-boat': ToBoatButton,
  },

  data () {
    return {
      center: L.latLng(0, 0),
      zoom: 3,
      map: null,
      currentCenter: L.latLng(0, 0),
      currentZoom: 3,

      wpColor: "red",
      wpTooltipOptions: {
        permanent: true,
        direction: 'right',
        className: 'wp-tooltip',
      },

      L: L,
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.map = this.$refs.map.mapObject;
    });
  },

  computed: {
    myBoatIcon() {
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='22px' height='22px'><g transform='rotate(" +
        radToDeg(this.$store.state.boat.instruments.course.value) +
        " 11 11)'><path d='M 8,22 C 5 10, 9 12, 11 0 C 13 12, 17 10,14 22 Z' fill-opacity='0' stroke-opacity='1' stroke='#ff00ff'/></g></svg>";
      const iconUrl = 'data:image/svg+xml;base64,' + btoa(svg);
      return this.L.icon({
        iconUrl: iconUrl,
        iconAnchor: [11, 11],
      });
    }
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
