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
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
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
      if (!this.cfgHighlightLeader ||
          (this.leaderId === null) ||
          (this.leaderId === this.playerId)) {
        return false;
      }
      if (this.showIds.includes(this.leaderId)) {
        return false;
      }
      if (this.currentFilter !== null) {
        return this.applyFilterToBoat(this.fleetBoatFromId(this.leaderId));
      }
      return true;
    },
    ...mapState({
      cfgHighlightLeader: state => state.map.cfg.highlightLeader.value,
    }),
    ...mapGetters({
      'showIds': 'race/fleet/combinedIds',
      currentFilter: 'ui/boatlists/currentFilter',
      applyFilterToBoat: 'ui/boatlists/applyFilterToBoat',
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
  },
}
</script>
