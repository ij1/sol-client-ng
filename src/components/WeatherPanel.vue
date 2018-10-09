<template>
  <div id="weather-panel" v-if="this.$store.state.weather.loaded">
    <div>
      <button @click="setTime(0)">&#124;&#9664;</button>
      <button @click="changeTime(-selectedStep)">&#9664;&#9664;</button>
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
      <button>&#9654;</button>
      <button @click="changeTime(selectedStep)">&#9654;&#9654;</button>
      <button @click="setTime(timescaleMax)">&#9654;&#124;</button>
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
    timescaleMax () {
      const range = this.weatherTimescales[this.selectedTimescale].range;
      if (range === -1) {
        return this.fullTimescale;
      }
      return range;
    },
    weatherTimeOffset () {
      return (this.$store.state.weather.time - this.$store.state.boat.instruments.time) / 1000;
    }
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
      if (this.weatherTimeOffset > this.timescaleMax) {
        this.setTime(this.timescaleMax);
      }
    },
    setTime (value) {
      console.log("setTime: " + value);
      this.$store.commit('weather/setTime', this.$store.state.boat.instruments.time + value * 1000);
    },
    changeTime (delta) {
      let value = this.weatherTimeOffset + delta;
      if (value < 0) {
        value = 0;
      } else if (value > this.timescaleMax) {
        value = this.timescaleMax;
      }
      this.setTime(value);
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
