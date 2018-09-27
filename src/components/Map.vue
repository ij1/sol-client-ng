<template>
  <div id="map-container">
    <l-map
      id="map"
      ref="map"
      :zoom="zoom"
      :center="center"
      @update:center="updateCenter"
      @update:zoom="updateZoom"
      :worldCopyJump="true"
    >
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
    </l-map>
  </div>
</template>

<script>
import L from 'leaflet'
import { LMap, LCircleMarker, LTooltip } from 'vue2-leaflet'

export default {
  name: 'Map',
  components: {
    'l-map': LMap,
    'l-circle-marker': LCircleMarker,
    'l-tooltip': LTooltip,
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
