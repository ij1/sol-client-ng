<template>
  <l-layer-group>
    <boat-trace
      v-if = "showLeaderTrace"
      :id = "leaderId"
    />
    <boat-trace
      v-for = "trace in showIds"
      :key = "trace"
      :id = "trace"
    />
    <boat-trace
      v-if = "showLeaderTrace"
      :id = "leaderId"
      :lng-offset = "-360"
    />
    <boat-trace
      v-for = "trace in showIds"
      :key = "'w' + trace"
      :id = "trace"
      :lng-offset = "-360"
    />
    <boat-trace
      v-if = "showLeaderTrace"
      :id = "leaderId"
      :lng-offset = "-720"
    />
    <boat-trace
      v-for = "trace in showIds"
      :key = "'ww' + trace"
      :id = "trace"
      :lng-offset = "-720"
    />
    <boat-trace
      v-if = "showLeaderTrace"
      :id = "leaderId"
      :lng-offset = "360"
    />
    <boat-trace
      v-for = "trace in showIds"
      :key = "'e' + trace"
      :id = "trace"
      :lng-offset = "360"
    />
  </l-layer-group>
</template>

<script>
import { mapGetters } from 'vuex';
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
             (this.leaderId !== this.playerId) &&
             !this.showIds.includes(this.leaderId);
    },
    ...mapGetters({
      'showIds': 'race/fleet/showIds',
    }),
  },
}
</script>
