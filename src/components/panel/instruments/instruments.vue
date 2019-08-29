<template>
  <div id="boat-instruments">
     <boat-instrument
       v-for = "instrument in $store.state.boat.instruments.list"
       v-bind:key = "instrument"
       v-bind:id = "instrument"
     />
  </div>
</template>

<script>
import Instrument from './instrument.vue';

export default {
  name: 'BoatInstruments',
  components: {
    'boat-instrument': Instrument,
  },
}
</script>

<style scoped>
#boat-instruments {
  display: flex;
  flex-direction: row;
}
</style>
