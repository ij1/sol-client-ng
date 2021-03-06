<template>
  <l-control :position = "'topleft'">
    <div id = "race-status" v-if = "uiComponentStatusBar">
      <span v-html="message"/>
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
    message () {
      if (!this.raceLoaded || (typeof this.raceMessage === 'undefined')) {
        return '&nbsp;';
      }
      return this.raceMessage;
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
      raceMessage: state => state.race.info.message,
      uiComponentStatusBar: state => state.ui.uiComponent.statusBar,
    }),
  },
  watch: {
    titlebar: {
      handler: function (newValue) {
        document.title = newValue;
      },
      immediate: true,
    },
  },
}
</script>

<style scoped>
#race-status {
  pointer-events: none;
  font-size: 12px;
  cursor: crosshair;
  position: relative;
  top: 6px;
}
.time-of-day-white #race-status {
  color: #000;
  background: rgba(200, 200, 200, 0.8);
}
.time-of-day-dark #race-status {
  color: #0f0;
  background: rgba(60, 60, 60, 0.8);
}
</style>
