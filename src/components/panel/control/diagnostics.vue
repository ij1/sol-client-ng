<template>
  <div id = "client-diagnostics">
    <div>
      <div>Browser id:{{browserId}}</div>
    </div>
    <div>
      <div>
        <div>wx:</div>
        <div>
          Origo
          lat {{$store.state.weather.data.origo[0]}}
          lng {{$store.state.weather.data.origo[1]}}
        </div>
        <div>
          Cell size
          {{$store.state.weather.data.increment[0]}}
          {{$store.state.weather.data.increment[1]}}
        </div>
      </div>
      <div>
        lat:
        {{$store.state.diagnostics.contoursDebug.minLatCell}} -
        {{$store.state.diagnostics.contoursDebug.maxLatCell}}
      </div>
      <div>
        lng:
        {{$store.state.diagnostics.contoursDebug.minLngCell}} -
        {{$store.state.diagnostics.contoursDebug.maxLngCell}}
      </div>
      <div>
        map bounds:
        {{$store.state.map.bounds.getSouth()}}
        {{$store.state.map.bounds.getWest()}}
        {{$store.state.map.bounds.getNorth()}}
        {{$store.state.map.bounds.getEast()}}
      </div>
      <div>
        y:
        {{$store.state.diagnostics.contoursDebug.yStart}} -
        {{$store.state.diagnostics.contoursDebug.yEnd}}
        {{$store.state.diagnostics.contoursDebug.yStartLat}} -
        {{$store.state.diagnostics.contoursDebug.yEndLat}}

      </div>
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
        {{message.time | msecToUTCString}} {{message.message}}
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
    msecToUTCString,
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
