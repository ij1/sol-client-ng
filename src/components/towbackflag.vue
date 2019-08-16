<template>
  <div
    id = "towback-flag"
    v-if = 'raceLoaded && isTowbackPeriod'
  >
    <div id = "towback-flag-outer">
      <div id = "towback-flag-inner"/>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'TowbackFlag',
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
#towback-flag {
  position: absolute;
  left: 70px;
  top: 36px;
  z-index: 900;
}
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
