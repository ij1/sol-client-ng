<template>
  <div id="weather-panel">
    <div id="weather-panel-placeholder" v-if="!this.wxLoaded">
      Waiting for the weather information to load...
    </div>
    <div id="weather-panel-control" v-if="this.wxLoaded">
      <button @click="setTime(0)">&#124;&#9664;</button>
      <button @click="changeTime(-selectedStep)">&#9664;&#9664;</button>
      <span>Weather forecasted for</span>
      <select
        :value = "selectedTimescale"
        @change = "onSelectTimescale($event.target.value)"
      >
        <option
          v-for = "(timescale, index) in weatherTimescales"
          :value = "index"
          :key = "index"
        >
          {{ timescale.range | formatTimescale(fullTimescale) }}
        </option>
      </select>
      <span>(Issued
        {{ this.wxUpdatedTime | formatTime }}):
        {{ this.wxTime | formatTime }}
        (+{{ this.timeOffset | formatOffset }})
      </span>
      <button v-if = "this.playTimer === null" @click="onPlay">&#9654;</button>
      <button v-if = "this.playTimer !== null" @click="cancelPlay">&#9642;</button>
      <span>Use</span>
      <select
        v-model="selectedStep"
      >
        <option
          v-for = "step in weatherSteps"
          :value = "step"
          :key = "step"
        >
          {{ step | formatStep }}
        </option>
      </select>
      <span>steps.</span>
      <button @click="changeTime(selectedStep)">&#9654;&#9654;</button>
      <button @click="setTime(offsetMax)">&#9654;&#124;</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { days, h, min, toDays, toH, toMin } from '../../lib/utils.js';

export default {
  name: 'WeatherPanel',
  data () {
    return {
      selectedTimescale: 3,  /* this.weatherTimescales.length - 1 */
      selectedStep: h(3),
      playTimer: null,
      tickInterval: 100,

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
      return this.wxDataTimescale.toFixed(0);
    },
    offsetMax () {
      const range = this.weatherTimescales[this.selectedTimescale].range;
      if (range === -1) {
        return this.fullTimescale;
      }
      return range.toFixed(0);
    },
    timeOffset () {
      return this.wxTime - this.boatTime;
    },
    playStep () {
      return this.weatherTimescales[this.selectedTimescale].playStep;
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      wxUpdatedTime: state => state.weather.data.updated,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
      wxTime: 'weather/time',
      wxDataTimescale: 'weather/dataTimescale',
    }),
  },

  filters: {
    formatTimescale (value, fullTimescale) {
      if (value === -1) {
        value = fullTimescale;
      }

      let divider = days(1);
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
    },
    formatTime (value) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const d = new Date(value);
      return days[d.getUTCDay()] + " " +
             ("0" + d.getUTCHours()).slice(-2) + ":" +
             ("0" + d.getUTCMinutes()).slice(-2) + "utc";
    },
    formatOffset (value) {
      const h = toH(value);
      const d = toDays(value);
      return (d < 1 ? '' : (Math.floor(d) + 'd')) +
             (h - Math.floor(d) * 24).toFixed(1) + 'h';
    }
  },

  methods: {
    onPlay () {
      if (this.playTimer === null) {
        this.playTimer = setInterval(this.onPlayTick.bind(this), this.tickInterval);
      } else {
        this.cancelPlay();
      }
    },
    cancelPlay () {
        if (this.playTimer !== null) {
          clearInterval(this.playTimer);
          this.playTimer = null;
        }
    },
    onPlayTick () {
      const oldTimeOffset = this.timeOffset;
      this.changeTime(this.playStep);
      if (this.timeOffset === oldTimeOffset) {
        this.cancelPlay();
      }
    },
    onSelectTimescale (value) {
      if (this.selectedTimescale !== parseInt(value)) {
        this.selectedStep = this.weatherTimescales[value].defaultStep;
      }
      this.selectedTimescale = value;
      if (this.timeOffset > this.offsetMax) {
        this.setTime(this.offsetMax);
      }
    },
    setTime (value) {
      this.$store.commit('weather/setTime', this.boatTime + value);
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
  width: 600px;
  height: 40px;
  left: 50%;
  bottom: 35px;
  margin-right: -50%;
  transform: translate(-50%, 0);
  border: 1px solid #f0f0f0;
  background: #ffffff;
}
#weather-panel-control span {
  font-size: 10px;
  padding: 1px;
}
#weather-panel-control button,select {
  border: none;
  padding: 1px;
  margin: 0px;
  font-size: 10px;
}
#weather-panel-control button {
  background: #ffffff;
}
#weather-panel-control select option {
  border: none;
  padding: 0px;
  margin: 0px;
  font-size: 10px;
}
</style>
