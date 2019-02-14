<template>
  <div id="status-bar">
    <div id="status-bar-left">
      <div v-if="this.$store.state.race.loaded">
        <span v-html="this.$store.state.race.info['message']"/>
        {{ this.boatInfo }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatusBar',
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
#status-bar {
  position: absolute;
  width: 100%;
  z-index: 1;
  font-size: 12px;
}

#status-bar-left {
  position: absolute;
  left: 0;
}
</style>
