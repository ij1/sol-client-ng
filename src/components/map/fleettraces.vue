<template>
  <l-layer-group>
    <boat-trace
      v-if = "this.showLeaderTrace"
      :id = "this.$store.state.race.fleet.leader"
    />
    <boat-trace
      v-for = "trace in this.otherTraces"
      :key = "trace"
      :id = "trace"
    />
  </l-layer-group>
</template>

<script>
import { LLayerGroup } from 'vue2-leaflet';
import BoatTrace from './trace.vue';

export default {
  name: 'FleetTraces',
  components: {
    'l-layer-group': LLayerGroup,
    'boat-trace': BoatTrace,
  },

  computed: {
    showLeaderTrace () {
      return (this.$store.state.race.fleet.leader !== null) &&
             (this.$store.state.race.fleet.leader !== this.$store.state.boat.id);
    },
    otherTraces () {
      return this.$store.state.race.fleet.selected;
    },
  },
}
</script>
