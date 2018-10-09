<template>
  <div id="weather-panel" v-if="this.$store.state.weather.loaded">
    <div>
      <select
        :value="weatherTimescale"
      >
        <option
          v-for = "timescale in weatherTimescales"
          :value = "timescale"
          :key = "timescale"
        >
          {{ timescale | formatTimescale(fullTimescale) }}
        </option>
      </select>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WeatherPanel',
  data () {
    return {
      weatherTimescale: -1,
    }
  },
  computed: {
    fullTimescale () {
      let f = this.$store.getters['weather/dataTimescale'];
      return (f / 1000).toFixed(0);
    }, 
    weatherTimescales () {
      return [12 * 3600, 24 * 3600, 48 * 3600, -1];
    },
  },
  filters:  {
    formatTimescale (value, fullTimescale) {
      if (value === -1) {
        value = fullTimescale;
      }
      let divider = value < 100 * 3600 ? 3600 : 86400;
      let unit = value < 100 * 3600 ? 'h' : 'd';
      return (value / divider).toFixed(1).replace(/\.0$/, '') + ' ' + unit;
    }
  },
}
</script>

<style scoped>
#weather-panel {
  position: absolute;
  width: 550px;
  height: 40px;
  left: 50%;
  bottom: 35px;
  margin-right: -50%;
  transform: translate(-50%, 0);
  border: 1px solid #f0f0f0;
  background: #ffffff;
}
</style>
