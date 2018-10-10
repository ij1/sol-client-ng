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
      <button @click="setTime(offsetMax)">&#9654;&#124;</button>
    </div>
  </div>
</template>

<script>
function h (value) {
  return value * 3600 * 1000;
}
function min (value) {
  return value * 60 * 1000;
}
function toH (value) {
  return value / (3600 * 1000);
}
function toMin (value) {
  return value / (60 * 1000);
}

export default {
  name: 'WeatherPanel',
  data () {
    return {
      selectedTimescale: 3,  /* this.weatherTimescales.length - 1 */
      selectedStep: h(3),

      weatherTimescales: [
        {
          range: h(12),
          defaultStep: min(30),
          playStep: min(2),
        },
        {
          range: h(24),
          defaultStep: h(1),
          playStep: min(5),
        },
        {
          range: h(48),
          defaultStep: h(2),
          playStep: min(10),
        },
        {
          range: -1,
          defaultStep: h(3),
          playStep: min(30),
        },
      ],
      weatherSteps: [
        min(2),
        min(5),
        min(10),
        min(30),
        h(1),
        h(2),
        h(3),
      ],
    }
  },

  computed: {
    fullTimescale () {
      let f = this.$store.getters['weather/dataTimescale'];
      return f.toFixed(0);
    },
    offsetMax () {
      const range = this.weatherTimescales[this.selectedTimescale].range;
      if (range === -1) {
        return this.fullTimescale;
      }
      return range.toFixed(0);
    },
    timeOffset () {
      return this.$store.state.weather.time - this.$store.state.boat.instruments.time;
    }
  },

  filters: {
    formatTimescale (value, fullTimescale) {
      if (value === -1) {
        value = fullTimescale;
      }

      let divider = h(24);
      let unit = 'd';
      if (value < h(100)) {
        divider = h(1);
        unit = 'h';
      }
      return (value / divider).toFixed(1).replace(/\.0$/, '') + ' ' + unit;
    },
    formatStep (value) {
      if (value < min(60)) {
        return (toMin(value)).toFixed(0) + ' min';
      }
      return (toH(value)).toFixed(0) + ' h';
    }
  },

  methods: {
    onSelectTimescale (e) {
      if (this.selectedTimescale !== parseInt(e.target.value)) {
        this.selectedStep = this.weatherTimescales[e.target.value].defaultStep;
      }
      this.selectedTimescale = e.target.value;
      if (this.timeOffset > this.offsetMax) {
        this.setTime(this.offsetMax);
      }
    },
    setTime (value) {
      this.$store.commit('weather/setTime', this.$store.state.boat.instruments.time + value);
    },
    changeTime (delta) {
      let value = this.timeOffset + delta;
      if (value < 0) {
        value = 0;
      } else if (value > this.offsetMax) {
        value = this.offsetMax;
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
