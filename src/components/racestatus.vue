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
      if (this.$store.state.boat.finish_time !== null) {
        return txt + ' has finished the race.';
      }
      return txt + ' ranked #' + this.$store.state.boat.ranking +
             ' with ' + this.$store.state.boat.dtg.toFixed(1) + 'nm to go.'
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
