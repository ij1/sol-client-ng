<template>
  <l-layer-group v-if = "this.$store.state.boat.position !== null">
    <l-marker
      :latLng="this.$store.state.boat.position"
      :icon="myBoatIcon"
    />
  </l-layer-group>
</template>

<script>
import L from 'leaflet'
import { LLayerGroup, LMarker } from 'vue2-leaflet'
import { radToDeg } from '../../lib/utils.js';

export default {
  name: 'Map',
  components: {
    'l-layer-group': LLayerGroup,
    'l-marker': LMarker,
  },

  computed: {
    myBoatIcon() {
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='22px' height='22px'><g transform='rotate(" +
        radToDeg(this.$store.state.boat.instruments.course.value) +
        " 11 11)'><path d='M 8,22 C 5 10, 9 12, 11 0 C 13 12, 17 10,14 22 Z' fill-opacity='0' stroke-opacity='1' stroke='#ff00ff'/></g></svg>";
      const iconUrl = 'data:image/svg+xml;base64,' + btoa(svg);
      return L.icon({
        iconUrl: iconUrl,
        iconAnchor: [11, 11],
      });
    }
  },
}
</script>
