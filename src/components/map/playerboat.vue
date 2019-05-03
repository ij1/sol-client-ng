<template>
  <l-layer-group v-if = "this.$store.state.boat.id !== null">
    <sail-boat
      :lat-lng="this.$store.state.boat.position"
      :course = "course"
      :twa = "twa"
      :color = "color"
      :scale = "scale"
      :strokeWidth = "strokeWidth"
    />
    <boat-trace :id = "this.$store.state.boat.id"/>
  </l-layer-group>
</template>

<script>
import { LLayerGroup } from 'vue2-leaflet';
import SailBoat from './sailboat.vue';
import BoatTrace from './trace.vue';

export default {
  name: 'PlayerBoat',
  components: {
    'l-layer-group': LLayerGroup,
    'sail-boat': SailBoat,
    'boat-trace': BoatTrace,
  },
  props: {
    course: {
      type: Number,
      required: true,
    },
    twa: {
      type: Number,
      required: true,
    },
    color: {
      type: String,
      default: '#ff00ff',
    },
    scale: {
      type: Number,
      default: 1,
    },
    strokeWidth: {
      type: Number,
      default: 2,
    },
  },
}
</script>
