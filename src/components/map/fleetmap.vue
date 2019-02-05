<template>
  <l-grid-layer
    :tile-component = "FleetTile"
    :z-index = "250"
    :no-wrap = "true"
  />
</template>

<script>
import { LGridLayer } from 'vue2-leaflet';
import FleetTile from './fleettile.vue';
import { boatPath } from '../../lib/boatshape.js';

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
      boatPath: new Path2D(boatPath(1)),
      FleetTile: FleetTile,
    }
  },
}
</script>
