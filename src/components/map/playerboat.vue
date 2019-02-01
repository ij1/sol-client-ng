<template>
  <l-layer-group v-if = "this.$store.state.boat.id !== null">
    <l-marker
      :latLng="this.$store.state.boat.position"
      :icon="myBoatIcon"
    />
    <boat-trace :id = "this.$store.state.boat.id"/>
  </l-layer-group>
</template>

<script>
import L from 'leaflet'
import { LLayerGroup, LMarker, LPolyline } from 'vue2-leaflet'
import { radToDeg } from '../../lib/utils.js';
import BoatTrace from './trace.vue';

export default {
  name: 'PlayerBoat',
  components: {
    'l-layer-group': LLayerGroup,
    'l-marker': LMarker,
    'l-polyline': LPolyline,
    'boat-trace': BoatTrace,
  },

  computed: {
    myBoatIcon() {
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='22px' height='22px'><g transform='rotate(" +
        radToDeg(this.$store.state.boat.instruments.course.value) +
        " 11 11)'><path d='M 8,22 C 5 10, 9 12, 11 0 C 13 12, 17 10,14 22 Z' fill='none' stroke-opacity='1' stroke-width='2' stroke='#ff00ff'/></g></svg>";
      const iconUrl = 'data:image/svg+xml;base64,' + btoa(svg);
      return L.icon({
        iconUrl: iconUrl,
        iconAnchor: [11, 11],
      });
    },
  },
}
</script>
