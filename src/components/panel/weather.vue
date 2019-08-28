<template>
  <div id="weather-panel">
    <div id = "weather-slider-container">
      <div
        id = "weather-slider"
        ref = "weatherslider"
        @mousedown = "onMouseDown"
      >
        <div
          id = "weather-slider-fg"
          :style = "{width: 'calc((100% - ' + sliderZeroPx + 'px) * ' + timeFrac + ' + ' + sliderZeroPx + 'px)'}"
        />
      </div>
    </div>
    <div id="weather-panel-placeholder" v-if="!wxLoaded">
      Waiting for the weather information to load...
    </div>
    <div id="weather-panel-placeholder" v-if="wxLoaded && !wxValidTimeseries">
      Weather information is truncated...
    </div>
    <div id="weather-panel-control" v-if="wxLoaded && wxValidTimeseries">
      <button @click="setTime(0)">&#124;&#9664;</button>
      <button @click="changeTime(-selectedStep)">&#9664;&#9664;</button>
      <span>Weather forecasted for</span>
      <select
        :value = "selectedTimescale"
        @change = "onSelectTimescale($event.target.value)"
      >
        <option
          v-for = "timescale in activeTimescales"
          :value = "timescale.idx"
          :key = "timescale.idx"
        >
          {{ timescale.range | formatTimescale(fullTimescale) }}
        </option>
      </select>
      <span>(Issued
        {{ wxUpdated | formatTime }}):
        {{ wxTime | formatTime }}
        (+{{ timeOffset | formatOffset }})
      </span>
      <button v-if = "playTimer === null" @click="onPlay">&#9654;</button>
      <button v-if = "playTimer !== null" @click="cancelPlay">&#9642;</button>
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
import { daysToMsec, hToMsec, minToMsec, msecToDays, msecToH, msecToMin } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import L from 'leaflet';

export default {
  name: 'WeatherPanel',
  data () {
    return {
      /* 24h / max (this.weatherTimescales.length - 1) */
      selectedTimescale: this.$store.state.weather.cfg.start24h.value ? 1 : 3,
      selectedStep: hToMsec(3),
      playTimer: null,
      tickInterval: 100,
      sliderZeroPx: 8,
      draggingSlider: false,

      weatherTimescales: [
        {
          range: hToMsec(12),
          defaultStep: minToMsec(30),
          playStep: minToMsec(2),
        },
        {
          range: hToMsec(24),
          defaultStep: hToMsec(1),
          playStep: minToMsec(5),
        },
        {
          range: hToMsec(48),
          defaultStep: hToMsec(2),
          playStep: minToMsec(10),
        },
        {
          range: -1,
          defaultStep: hToMsec(3),
          playStep: minToMsec(30),
        },
      ],
      weatherSteps: [
        minToMsec(2),
        minToMsec(5),
        minToMsec(10),
        minToMsec(30),
        hToMsec(1),
        hToMsec(2),
        hToMsec(3),
      ],
    }
  },

  computed: {
    wxValidTimeseries () {
      return this.wxLoaded && (this.wxLastTimestamp > this.boatTime);
    },
    activeTimescales () {
      let res = [];
      for (let i = 0; i < this.weatherTimescales.length; i++) {
        if (this.weatherTimescales[i].range > this.fullTimescale) {
          continue;
        }
        res.push({
          idx: i,
          ...this.weatherTimescales[i],
        });
      }
      return res;
    },
    fullTimescale () {
      return this.wxDataTimescale;
    },
    offsetMax () {
      const range = this.weatherTimescales[this.selectedTimescale].range;
      if (range === -1) {
        return this.fullTimescale;
      }
      /* Safeguard against truncated wx, normally range < this.fullTimescale */
      return Math.min(range, this.fullTimescale);
    },
    timeOffset () {
      return this.wxTime - this.boatTime;
    },
    timeFrac () {
      return this.timeOffset / this.offsetMax;
    },
    playStep () {
      return this.weatherTimescales[this.selectedTimescale].playStep;
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      wxTime: state => state.weather.time,
      wxUpdated: state => state.weather.data.updated,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
      wxDataTimescale: 'weather/dataTimescale',
      wxLastTimestamp: 'weather/lastTimestamp',
    }),
  },

  filters: {
    formatTimescale (value, fullTimescale) {
      if (value === -1) {
        value = fullTimescale;
      }

      let divider = daysToMsec(1);
      let unit = 'd';
      if (value < hToMsec(100)) {
        divider = hToMsec(1);
        unit = 'h';
      }
      return roundToFixed(value / divider, 1).replace(/\.0$/, '') + ' ' + unit;
    },
    formatStep (value) {
      if (value < minToMsec(60)) {
        return (msecToMin(value)).toFixed(0) + ' min';
      }
      return (msecToH(value)).toFixed(0) + ' h';
    },
    formatTime (value) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const d = new Date(value);
      return days[d.getUTCDay()] + " " +
             ("0" + d.getUTCHours()).slice(-2) + ":" +
             ("0" + d.getUTCMinutes()).slice(-2) + "utc";
    },
    formatOffset (value) {
      const h = msecToH(value);
      const d = msecToDays(value);
      return (d < 1 ? '' : (Math.floor(d) + 'd')) +
             roundToFixed(h - Math.floor(d) * 24, 1) + 'h';
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
    onDragTo (ev) {
      const pt = L.DomEvent.getMousePosition(ev, this.$refs.weatherslider);
      const x = Math.floor(pt.x) - this.sliderZeroPx / 2;
      let frac = x / (this.$refs.weatherslider.offsetWidth - this.sliderZeroPx);
      frac = Math.min(1, frac);
      frac = Math.max(0, frac);
      this.setTime(Math.round(frac * this.offsetMax));
    },
    onMouseMove (ev) {
      this.onDragTo(ev);
    },
    onMouseDown (ev) {
      if (!this.wxLoaded) {
        return;
      }
      this.draggingSlider = true;
      window.addEventListener('mousemove', this.onMouseMove);
      this.onDragTo(ev);
    },
    onMouseUp () {
      if (this.draggingSlider) {
        window.removeEventListener('mousemove', this.onMouseMove);
      }
      this.draggingSlider = false;
    },
  },
  mounted () {
    window.addEventListener('mouseup', this.onMouseUp);
  },
  beforeDestroy () {
    window.removeEventListener('mouseup', this.onMouseUp);
    if (this.draggingSlider) {
      window.removeEventListener('mousemove', this.onMouseMove);
    }
  },
}
</script>

<style scoped>
#weather-panel {
  position: absolute;
  width: 630px;
  height: 40px;
  left: 50%;
  bottom: 35px;
  margin-right: -50%;
  transform: translate(-50%, 0);
  border: 1px solid #f0f0f0;
  background: #ddd;
  mix-blend-mode: multiply;
}
#weather-slider-container {
  position: relative;
  width: 100%;
}
#weather-slider {
  position: relative;
  width: 100%;
  background-image: linear-gradient(#eee, #ccc, #eee);
}
#weather-slider-fg {
  position: absolute;
  background-image: linear-gradient(#7ac, #7cf, #7ac);
}
#weather-slider, #weather-slider-fg {
  border-radius: 5px;
  height: 9px;
}
#weather-panel-control span {
  font-size: 11px;
  padding: 1px;
}
#weather-panel-control button,select {
  border: none;
  padding: 1px;
  margin: 0px;
  font-size: 11px;
}
#weather-panel-control button {
  background: #ffffff;
}
#weather-panel-control select option {
  border: none;
  padding: 0px;
  margin: 0px;
  font-size: 11px;
}
</style>
