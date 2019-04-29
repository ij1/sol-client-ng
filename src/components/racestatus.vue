<template>
  <l-control :position = "'topleft'">
    <div id = "race-status" v-if="this.$store.state.race.loaded">
      <span v-html="this.$store.state.race.info['message']"/>
      {{ this.boatInfo }}
    </div>
  </l-control>
</template>

<script>
import { LControl } from 'vue2-leaflet';
import { roundToFixed } from '../lib/utils.js';

export default {
  name: 'StatusBar',
  components: {
    'l-control': LControl,
  },
  computed: {
    boatInfo () {
      if (this.$store.state.boat.id === null) {
        return '';
      }
      let txt = 'Boat ' + this.$store.state.boat.name;
      if (this.$store.state.boat.finishTime !== null) {
        return txt + ' has finished the race.';
      }
      return txt + ' ranked #' + this.$store.state.boat.ranking +
             ' with ' + roundToFixed(this.$store.state.boat.dtg, 1) + 'nm to go.'
    },
  },
}
</script>

<style scoped>
#race-status {
  pointer-events: none;
  font-size: 12px;
}
</style>
