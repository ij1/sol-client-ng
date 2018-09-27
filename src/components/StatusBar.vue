<template>
  <div id="status-bar">
    <div id="status-bar-left">
      <div v-if="this.$store.state.race.loaded">
        <span v-html="this.$store.state.race.info['message']"/>
      </div>
    </div>
    <div id="status-bar-right">
      <div v-if="this.$store.state.boat.dcs.length > 0">
        Next DC:
        FIXME in FIXME
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatusBar',
  data () {
    return {
    }
  },
}
</script>

<style scoped>
#status-bar {
  position: absolute;
  width: 100%;
  z-index: 1;
}

#status-bar-left {
  position: absolute;
  left: 0;
}
#status-bar-right {
  position: absolute;
  right: 0;
}
</style>
