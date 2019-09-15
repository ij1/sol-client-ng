<template>
  <div id="bottom-panel">
    <weather-panel v-if = "$store.state.ui.config.loaded">
      <!-- config for 24h wx needs to be loaded prior panel -->
    </weather-panel>
    <boat-instruments/>
    <bottom-spacer/>
  </div>
</template>

<script>
import WeatherPanel from './weather.vue';
import BoatInstruments from './instruments/instruments.vue';
import BottomSpacer from './bottomspacer.vue';

export default {
  name: 'WeatherPanelWrapper',
  components: {
    'weather-panel': WeatherPanel,
    'boat-instruments': BoatInstruments,
    'bottom-spacer': BottomSpacer,
  },
}
</script>

<style scoped>
#bottom-panel {
  position: absolute;
  left: 50%;
  bottom: 0;
  margin-right: -50%;
  transform: translate(-50%, 0);
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
