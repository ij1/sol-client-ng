<template>
  <l-control :position = "'topleft'">
    <div id = "race-status" v-if="$store.state.race.loaded">
      <span v-html="$store.state.race.info['message']"/>
      {{ boatInfo }}
    </div>
  </l-control>
</template>

<script>
import { mapState } from 'vuex';
import { LControl } from 'vue2-leaflet';
import { roundToFixed } from '../lib/quirks.js';

export default {
  name: 'StatusBar',
  components: {
    'l-control': LControl,
  },
  computed: {
    boatInfo () {
      if (this.boatId === null) {
        return '';
      }
      let txt = 'Boat ' + this.boatName;
      if (this.boatFinishTime !== null) {
        return txt + ' has finished the race.';
      }
      return txt + ' ranked #' + this.boatRanking +
             ' with ' + roundToFixed(this.boatDtg, 1) + 'nm to go.'
    },
    /* Handle also browser titlebar here */
    titlebar () {
      if (!this.raceLoaded) {
        return 'Sailonline.org client';
      }
      return 'Sailonline.org - ' + this.raceName;
    },
    ...mapState({
      boatId: state => state.boat.id,
      boatName: state => state.boat.name,
      boatFinishTime: state => state.boat.finishTime,
      boatRanking: state => state.boat.ranking,
      boatDtg: state => state.boat.dtg,
      raceLoaded: state => state.race.loaded,
      raceName: state => state.race.info.name,
    }),
  },
  watch: {
    titlebar (newValue) {
      document.title = newValue;
    }
  },
}
</script>

<style scoped>
#race-status {
  pointer-events: none;
  font-size: 12px;
}
</style>
