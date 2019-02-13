<template>
  <div id = "client-diagnostics">
    <div>
      <div>Errors: {{this.$store.state.solapi.errorLog.length}}</div>
    </div>
    <div>
      <div>Locked API calls</div>
      <div v-for = "call in apiCalls" :key = "call">{{call}}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ClientDiagnostics',
  computed: {
    apiCalls () {
      this.$store.state.solapi.activeApiCallsStamp;
      return Array.from(this.$store.state.solapi.activeApiCalls.values());
    }
  },
}
</script>

<style>
#client-diagnostics {
  text-align: left;
}
</style>
