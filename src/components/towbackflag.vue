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
    ...mapState({
      raceLoaded: state => state.race.loaded,
      raceStartTime: state => state.race.info.startTime,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
      isTowbackPeriod: 'race/isTowbackPeriod',
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
