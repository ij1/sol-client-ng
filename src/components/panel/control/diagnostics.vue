<template>
  <div id = "client-diagnostics">
    <div>
      <div>Errors:</div>
      <div
         v-for = "apiCall in erroredApiCalls"
         :key = "apiCall"
      >
        {{apiCall}} {{$store.state.solapi.errorLog[apiCall].length}}
      </div>
    </div>
    <div>
      <div>Locked API calls</div>
      <div v-for = "call in lockedApiCalls" :key = "call">{{call}}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ClientDiagnostics',
  computed: {
    lockedApiCalls () {
      this.$store.state.solapi.activeApiCallsStamp;
      return Array.from(this.$store.state.solapi.activeApiCalls.values());
    },
    erroredApiCalls () {
      return Object.keys(this.$store.state.solapi.errorLog).sort((a, b) => {
        return a - b;
      });
    },
  },
}
</script>

<style>
#client-diagnostics {
  text-align: left;
}
</style>
