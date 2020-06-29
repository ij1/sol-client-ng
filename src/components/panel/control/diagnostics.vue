<template>
  <div id = "client-diagnostics">
    <div v-if = "cfgExtraNetDebug">
      <div>Active API calls:</div>
      <div
        v-for = "call in activeApiCalls"
        :key = "call.id"
      >
        {{call.apiCall}}
        {{call.received}}{{call.len !== null ? '/' + call.len : ''}}B
        {{call.firstByteDelay | formatSec}}s
        {{call.readDelayMax | formatSec}}s
        {{call.lastUpdate | elapsedSinceLastUpdate(siteTime)}}s
      </div>
      <div>Old API calls:</div>
      <div
        v-for = "call in pastApiCalls"
        class = "diag-old-apicall"
        :key = "call.id"
      >
        {{call.apiCall}}
        {{call.received}}{{call.len !== null ? '/' + call.len : ''}}B
        {{call.duration | formatSec}}s
        {{call.status}}
        {{call.firstByteDelay | formatSec}}s
        {{call.readDelayMax | formatSec}}s
      </div>
    </div>
    <div>
      <div>API call summary:</div>
      <div
         v-for = "apiCall in apiCallStats"
         :key = "'s' + apiCall.apiCall"
      >
        {{apiCall.apiCall}}
        {{apiCall.count}}
        <span
          v-if = "apiCall.errors === 0"
        >
          E:{{apiCall.errors}}
        </span>
        <span
          v-if = "apiCall.errors > 0"
          @click = "$store.commit('diagnostics/popupApiErrors', apiCall.apiCall)"
        >
          E:{{apiCall.errors}}
        </span>
        {{apiCall.size.avg | roundSize}}/{{apiCall.size.max | roundSize}}B
        {{apiCall.duration.avg | formatSec}}/{{apiCall.duration.max | formatSec}}s
        <span v-if = "cfgExtraNetDebug">
          {{apiCall.firstByteDelay.avg | formatSec}}/{{apiCall.firstByteDelay.max | formatSec}}s
          {{apiCall.readDelay.avg | formatSec}}/{{apiCall.readDelay.max | formatSec}}s
        </span>
      </div>
    </div>
    <div>
      <div>API locks:</div>
      <div v-for = "call in apiLocks" :key = "call">{{call}}</div>
    </div>
    <div>
      <div>Browser id:{{browserId}}</div>
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
      if (msec === null) {
        return '---';
      }
      return msecToUTCString(msec) + '.' + ('000' + (msec % 1000)).slice(-3);
    },
    formatSec (msec) {
      if (msec === null) {
        return '---';
      }
      return (msec / 1000).toFixed(3);
    },
    elapsedSinceLastUpdate (msec, siteTime) {
      return Math.round((siteTime - msec) / 1000);
    },
    roundSize(val) {
      if (val === null) {
        return '-';
      }
      return val.toFixed(0);
    },
  },
  computed: {
    apiLocks () {
      this.$store.state.solapi.apiLocksStamp;
      return Array.from(this.$store.state.solapi.apiLocks.values());
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
      activeApiCalls: state => state.solapi.activeApiCalls,
      pastApiCalls: state => state.solapi.pastApiCalls,
      apiCallStats: state => state.solapi.apiCallStats,
      siteTime: state => state.time.siteTime,
      cfgExtraNetDebug: state => state.diagnostics.cfg.extraNetDebug.value,
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
.diag-old-apicall {
  color: #777;
}
</style>
