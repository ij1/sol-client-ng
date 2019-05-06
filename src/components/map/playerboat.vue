<template>
  <l-layer-group v-if = "boatId !== null">
    <sail-boat
      :lat-lng="boatPosition"
      :course = "course"
      :twa = "twa"
      :color = "color"
      :scale = "scale"
      :strokeWidth = "strokeWidth"
    />
    <map-polar
      :lat-lng="boatPosition"
      :twd = "twd"
    />
    <boat-trace :id = "boatId"/>
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup } from 'vue2-leaflet';
import SailBoat from './sailboat.vue';
import MapPolar from './mappolar.vue';
import BoatTrace from './trace.vue';

export default {
  name: 'PlayerBoat',
  components: {
    'l-layer-group': LLayerGroup,
    'sail-boat': SailBoat,
    'map-polar': MapPolar,
    'boat-trace': BoatTrace,
  },
  props: {
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

  computed: {
    ...mapState({
      boatId: state => state.boat.id,
      boatPosition: state => state.boat.position,
      course: state => state.boat.instruments.course.value,
      twa: state => state.boat.instruments.twa.value,
      twd: state => state.boat.instruments.twd.value,
    }),
  },
}
</script>
