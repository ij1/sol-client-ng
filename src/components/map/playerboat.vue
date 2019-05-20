<template>
  <l-layer-group v-if = "boatId !== null">
    <sail-boat
      :lat-lng="visualPosition"
      :course = "course"
      :twa = "twa"
      :color = "'#ff00ff'"
      :scale = "1"
      :strokeWidth = "2"
    />
    <map-polar
      :lat-lng="visualPosition"
      :twd = "twd"
      :show-polar = "showPolar"
    />
    <boat-trace :id = "boatId"/>
    <boat-trace :id = "boatId" :lng-offset = "-360"/>
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
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
      course: state => state.boat.instruments.course.value,
      twa: state => state.boat.instruments.twa.value,
      twd: state => state.boat.instruments.twd.value,
      steeringPolar: state => state.boat.steering.visualSteering.showPolar,
      alwaysShowPolar: state => state.boat.instruments.cfg.visualizePolar.value,
    }),
    ...mapGetters({
      visualPosition: 'boat/visualPosition',
    }),
  },
}
</script>
