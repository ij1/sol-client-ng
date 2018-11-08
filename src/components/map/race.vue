<template>
  <l-layer-group v-if="this.$store.state.race.loaded">
    <l-rectangle
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
  </l-layer-group>
</template>

<script>
import { LLayerGroup, LCircleMarker, LRectangle, LTooltip } from 'vue2-leaflet'

export default {
  name: 'Map',
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle-marker': LCircleMarker,
    'l-rectangle': LRectangle,
    'l-tooltip': LTooltip,
  },

  data () {
    return {
      map: null,

      wpColor: "red",
      wpTooltipOptions: {
        permanent: true,
        direction: 'right',
        className: 'wp-tooltip',
      },
    }
  },
}
</script>
