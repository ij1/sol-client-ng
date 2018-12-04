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
      <div v-if = "this.countNonExpandedBoats > 0">
        +{{this.countNonExpandedBoats}} boats
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
  data () {
    return {
      maxExpandedBoats: 3,
    }
  },
  computed: {
    hoverListIds () {
      /* Dummy dep */
      this.$store.state.race.fleet.fleetTime;

      if (this.hoverLatLng === null) {
        return [];
      }

      const res = this.$store.getters['race/fleet/searchAt'](this.hoverLatLng, this.$parent.$parent.currentZoom, 3);

      let self = this;
      return res.sort((a, b) => {
        const aa = self.fleetBoatFromId(a.id).ranking;
        const bb = self.fleetBoatFromId(b.id).ranking;
        return aa - bb;
      });
    },
    hoverBoatList () {
      let self = this;
      return this.hoverListIds.slice(0, this.maxExpandedBoats).map(
        i => self.fleetBoatFromId(i.id)
      );
    },
    countNonExpandedBoats () {
      return this.hoverListIds.length - this.hoverBoatList.length;
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
