<template>
  <div id = "client-diagnostics">
    <div>
      <div>Browser id:{{browserId}}</div>
    </div>
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
      <div>Locked API calls:</div>
      <div v-for = "call in lockedApiCalls" :key = "call">{{call}}</div>
    </div>
    <div>
      <div
        v-for = "message in diagnosticsMessages"
        :key = "message.id"
      >
        {{message.time | msecFormat}} {{message.message}}
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { msecToUTCString } from '../../../lib/utils.js';

export default {
  name: 'ClientDiagnostics',
  filters: {
    msecFormat (msec) {
      return msecToUTCString(msec) + '.' + ('000' + (msec % 1000)).slice(-3);
    },
  },
  computed: {
    lockedApiCalls () {
      this.$store.state.solapi.activeApiCallsStamp;
      return Array.from(this.$store.state.solapi.activeApiCalls.values());
    },
    erroredApiCalls () {
      return Object.keys(this.$store.state.solapi.errorLog).sort((a, b) => {
        return a.localeCompare(b);
      });
    },
    browserId () {
      let id = "";
      for (let i of Object.keys(L.Browser)) {
        if (L.Browser[i] === true) {
          id += " " + i;
        }
      }
      return id;
    },
    ...mapState({
      diagnosticsMessages: state => state.diagnostics.messages,
    }),
  },
}
</script>

<style scoped>
#client-diagnostics {
  text-align: left;
  font-size: 10px;
  overflow: scroll;
  height: 100%;
}
</style>
