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
      <l-rectangle
        v-if="this.$store.state.race.boundary.length == 2"
        :bounds="this.$store.state.race.boundary"
        :fill="false"
        :weight="2"
        color="magenta"
      />
      <l-circle-marker
        v-for="(waypoint, index) in this.$store.state.race.route"
        :key="index"
        :latLng="waypoint.latLng"
        :fillColor="wpColor"
        :radius="2"
        :color="wpColor"
        :fillOpacity="1"
      >
        <l-tooltip
          :options="wpTooltipOptions"
        >
          <span v-html="waypoint.name"/>
        </l-tooltip>
      </l-circle-marker>
      <l-marker
        v-if = "this.$store.state.boat.position !== null"
        :latLng="this.$store.state.boat.position"
        :icon="myBoatIcon"
      />
      <wind-info :map = "this.map"/>
      <wind-map
        :map = "this.map"
        :center = "this.currentCenter"
        :zoom = "this.currentZoom"
      />
    </l-map>
  </div>
</template>

<script>
import L from 'leaflet'
import { LMap, LCircleMarker, LMarker, LRectangle, LTooltip } from 'vue2-leaflet'
import WindInfo from './WindInfo'
import WindMap from './WindMap'

export default {
  name: 'Map',
  components: {
    'l-map': LMap,
    'l-circle-marker': LCircleMarker,
    'l-marker': LMarker,
    'l-rectangle': LRectangle,
    'l-tooltip': LTooltip,
    'wind-info': WindInfo,
    'wind-map': WindMap,
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
        (this.$store.state.boat.instruments.cog * 180 / Math.PI) +
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
@import '../../node_modules/leaflet/dist/leaflet.css'
</style>

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
