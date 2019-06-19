<template>
  <weather-panel v-if = "$store.state.ui.config.loaded">
    <!-- config for 24h wx needs to be loaded prior panel -->
  </weather-panel>
</template>

<script>
import WeatherPanel from './weather.vue';

export default {
  name: 'WeatherPanelWrapper',
  components: {
    'weather-panel': WeatherPanel,
  }
}
</script>
