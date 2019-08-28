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
  position: absolute;
  left: 50%;
  bottom: 0;
  margin-right: -50%;
  transform: translate(-50%, 0);
  border: 1px solid #c0c0c0;
  background-image: linear-gradient(#f0f0f0, #707070);
  display: flex;
  flex-direction: row;
}
</style>
