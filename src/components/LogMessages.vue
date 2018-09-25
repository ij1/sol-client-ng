<template>
  <div id="log-messages">
    <div v-if="this.$store.state.solapi.errorLog.length > 0">
      Errors:
      {{ this.$store.state.solapi.errorLog }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'LogMessages',
  data () {
    return {}
  },
}
</script>

<style scoped>
#log-messages {
  position: absolute;
  left: 0;
  top: 10%;
  height: 15%;
  font-size: 8px;
}
</style>
