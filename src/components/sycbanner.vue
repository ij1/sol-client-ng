<template>
  <div v-if = "boatSyc === false">
    <img src="images/joinsyc.png">
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'SycBanner',
  computed: {
    boatSyc () {
      const boat = this.boatFromId(this.boatId);
      if (typeof boat !== 'undefined') {
        return boat.syc;
      }
      return null;
    },
    ...mapState({
      boatId: state => state.boat.id,
    }),
    ...mapGetters({
      boatFromId: 'race/fleet/boatFromId',
    }),
  },
}
</script>
