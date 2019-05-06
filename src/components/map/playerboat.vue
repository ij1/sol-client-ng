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
    <map-polar
      :lat-lng="this.$store.state.boat.position"
      :twd = "twd"
    />
    <boat-trace :id = "this.$store.state.boat.id"/>
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

  computed: {
    ...mapState({
      twd: state => state.boat.instruments.twd.value,
    }),
  },
}
</script>
