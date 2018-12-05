<template>
  <l-layer-group>
    <boat-trace
      v-if = "this.showLeaderTrace"
      :id = "this.leaderId"
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
    playerId () {
      return this.$store.state.boat.id;
    },
    leaderId () {
      return this.$store.state.race.fleet.leader;
    },
    showLeaderTrace () {
      return (this.leaderId !== null) &&
             (this.leaderId !== this.playerId);
    },
    otherTraces () {
      return this.$store.state.race.fleet.selected.concat(
        this.$store.state.race.fleet.hover
      ).sort().filter((item, pos, arr) => {
        return !pos || (item !== arr[pos - 1] && item !== this.leaderId)
      });
    },
  },
}
</script>
