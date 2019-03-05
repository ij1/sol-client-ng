<template>
  <l-grid-layer
    :tile-component = "FleetTile"
    :z-index = "250"
    :no-wrap = "true"
    :options = "{ceilZoom: true}"
  />
</template>

<script>
import { LGridLayer } from 'vue2-leaflet';
import FleetTile from './fleettile.vue';

export default {
  name: 'FleetMap',

  components: {
    'l-grid-layer': LGridLayer,
  },

  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      FleetTile: FleetTile,
    }
  },
}
</script>
