<template>
  <div id="weather-panel" v-if="this.$store.state.weather.loaded">
    <div>
      <select
        :value = "selectedTimescale"
        @input = "onSelectTimescale"
      >
        <option
          v-for = "(timescale, index) in weatherTimescales"
          :value = "index"
          :key = "index"
        >
          {{ timescale.range | formatTimescale(fullTimescale) }}
        </option>
      </select>
      <select
        :value="selectedStep"
      >
        <option
          v-for = "step in weatherSteps"
          :value = "step"
          :key = "step"
        >
          {{ step | formatStep }}
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
      selectedTimescale: 3,  /* this.weatherTimescales.length - 1 */
      selectedStep: 3 * 3600,

      weatherTimescales: [
        {
          range: 12 * 3600,
          defaultStep: 30 * 60,
          playStep: 2 * 60,
        },
        {
          range: 24 * 3600,
          defaultStep: 3600,
          playStep: 5 * 60,
        },
        {
          range: 48 * 3600,
          defaultStep: 2 * 3600,
          playStep: 10 * 60,
        },
        {
          range: -1,
          defaultStep: 3 * 3600,
          playStep: 30 * 60,
        },
      ],
      weatherSteps: [2 * 60, 5 * 60, 10 * 60, 30 * 60, 3600, 2 * 3600, 3 * 3600],
    }
  },

  computed: {
    fullTimescale () {
      let f = this.$store.getters['weather/dataTimescale'];
      return (f / 1000).toFixed(0);
    }, 
  },

  filters: {
    formatTimescale (value, fullTimescale) {
      if (value === -1) {
        value = fullTimescale;
      }
      let divider = value < 100 * 3600 ? 3600 : 86400;
      let unit = value < 100 * 3600 ? 'h' : 'd';
      return (value / divider).toFixed(1).replace(/\.0$/, '') + ' ' + unit;
    },
    formatStep (value) {
      value /= 60;
      if (value >= 60) {
        return (value/60).toFixed(0) + ' h';
      }
      return value.toFixed(0) + ' min';
    }
  },

  methods: {
    onSelectTimescale (e) {
      this.selectedStep = this.weatherTimescales[e.target.value].defaultStep;
      this.selectedTimescale = e.target.value;
    },
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
