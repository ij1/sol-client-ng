<template>
  <div id="boat-instruments">
     <boat-instrument
       v-for = "instrument in instrumentList"
       v-bind:key = "instrument.name"
       v-bind:name = "instrument.name"
       v-bind:unit = "instrument.unit"
       v-bind:mult = "instrument.mult"
       v-bind:decimals = "instrument.decimals"
       v-bind:datafield = "instrument.datafield"
     />
  </div>
</template>

<script>
import BoatInstrument from './BoatInstrument.vue';

export default {
  name: 'BoatInstruments',
  components: {
    'boat-instrument': BoatInstrument,
  },
  data () {
    return {
      loading: false,
      name: null,
      unit: null,
      status: null,
      instrumentList: [
        {name: "LAT", unit: "\xb0", datafield: "lat", mult: 1, decimals: 3},
        {name: "LON", unit: "\xb0", datafield: "lon", mult: 1, decimals: 3},
        {name: "SPEED", unit: "kn", datafield: "sog", mult: 1, decimals: 2},
        {name: "COURSE", unit: "\xb0", datafield: "cog", mult: 180 / Math.PI, decimals: 2},
        {name: "TWA", unit: "\xb0", datafield: "twa", mult: 180 / Math.PI, decimals: 2},
        {name: "TWD", unit: "\xb0", datafield: "twd", mult: 180 / Math.PI, decimals: 2},
	// FIXME: move KNT_MS to somewhere else and use as literal
        {name: "TWS", unit: "kn", datafield: "tws", mult: 1.94384449, decimals: 2},
	// VMG
	// VMC
        {name: "PERF", unit: "%", datafield: "efficiency", mult: 100, decimals: 2},
	// How is clock derived?
      ]
    }
  },
}
</script>

<style scoped>
#boat-instruments {
  position: absolute;
  left: 50%;
  bottom: 0;
  margin-right: -50%;
  transform: translate(-50%, 0);
  border: 1px solid #f0f0f0;
  background-image: linear-gradient(#f0f0f0, #101010);
}
</style>
