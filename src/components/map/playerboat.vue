<template>
  <l-layer-group v-if = "boatId !== null">
    <sail-boat
      :lat-lng="boatPosition"
      :course = "course"
      :twa = "twa"
      :color = "'#ff00ff'"
      :scale = "1"
      :strokeWidth = "2"
    />
    <map-polar
      :lat-lng="boatPosition"
      :twd = "twd"
      :show-polar = "showPolar"
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
  computed: {
    showPolar () {
      return this.alwaysShowPolar || this.steeringPolar;
    },
    ...mapState({
      boatId: state => state.boat.id,
      boatPosition: state => state.boat.position,
      course: state => state.boat.instruments.course.value,
      twa: state => state.boat.instruments.twa.value,
      twd: state => state.boat.instruments.twd.value,
      steeringPolar: state => state.boat.steering.visualSteering.showPolar,
      alwaysShowPolar: state => state.boat.instruments.cfg.visualizePolar.value,
    }),
  },
}
</script>
