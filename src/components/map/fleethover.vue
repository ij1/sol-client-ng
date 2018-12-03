<template>
  <l-control
    id = "fleet-info-ctrl"
    :position = "'bottomleft'"
  >
    <div
      v-if = "this.hoverListIds.length > 0"
      id = "fleet-info"
    >
      <div
        v-for = "boat in this.hoverBoatList"
        :key = "boat.id"
      >
        {{boat.ranking}} {{boat.country}} {{ boat.name }}
      </div>
    </div>
  </l-control>
</template>

<script>
import { mapGetters } from 'vuex';
import { LControl } from 'vue2-leaflet'

export default {
  name: 'FleetHover',
  components: {
    'l-control': LControl,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
    hoverLatLng: {
      type: Object,
    },
  },
  computed: {
    hoverListIds () {
      /* Dummy dep */
      this.$store.state.race.fleet.fleetTime;

      if (this.hoverLatLng === null) {
        return [];
      }

      const res = this.$store.getters['race/fleet/searchAt'](this.hoverLatLng, this.map, 3);

      let self = this;
      return res.sort((a, b) => {
        const aa = self.fleetBoatFromId(a.id).ranking;
        const bb = self.fleetBoatFromId(b.id).ranking;
        return aa - bb;
      });
    },
    hoverBoatList () {
      let self = this;
      return this.hoverListIds.map(i => self.fleetBoatFromId(i.id));
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
  },
}
</script>

<style scoped>
#fleet-info-ctrl {
  pointer-events: none;
}
#fleet-info {
  text-align: left;
}
</style>
