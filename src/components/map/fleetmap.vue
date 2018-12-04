<template>
  <l-grid-layer
    :tileComponent = "FleetTile"
    :zIndex = "250"
    :noWrap = "true"
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
      boatPath: new Path2D('M -3,11 C -6 -1, -2 1, 0 -11 C 2 1, 6 -1, 3,11 Z'),
      FleetTile: FleetTile,
    }
  },
}
</script>
