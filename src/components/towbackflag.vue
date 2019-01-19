<template>
  <l-control
    id = "towback-flag"
    :position = "'topleft'"
    v-if = 'this.raceLoaded && this.isTowbackPeriod'
  >
    <div id = "towback-flag-outer">
      <div id = "towback-flag-inner"/>
    </div>
  </l-control>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'TowbackFlag',
  components: {
    'l-control': LControl,
  },
  computed: {
    isTowbackPeriod () {
      return (this.towBackPeriod.start <= this.boatTime) &&
             (this.boatTime < this.towBackPeriod.end);
    },
    ...mapState({
      raceLoaded: state => state.race.loaded,
      raceStartTime: state => state.race.info.start_time,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
      towBackPeriod: 'race/towBackPeriod',
    }),
  },
}
</script>

<style scoped>
#towback-flag-outer {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 90px;
  height: 90px;
  background: blue; 
}
#towback-flag-inner {
  position: absolute;
  top: 30px;
  left: 30px;
  width: 30px;
  height: 30px;
  background: white;
}
</style>
