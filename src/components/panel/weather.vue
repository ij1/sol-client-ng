<template>
  <form
    id = "weather-panel"
    @keydown.left.prevent = "changeTime(-selectedStep)"
    @keydown.right.prevent = "changeTime(selectedStep)"
    @click.prevent = "focusPanel"
  >
    <div id = "weather-slider-container">
      <div
        id = "weather-slider"
        ref = "weatherslider"
        tabindex = "0"
        @mousedown = "onMouseDown"
        @touchstart = "onMouseDown"
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
      <button
        @click.prevent = "setTime(0)"
      >
        &#124;&#9664;
      </button>
      <button
        @click.prevent = "changeTime(-selectedStep)"
      >
        &#9664;&#9664;
      </button>
      <span>Weather forecasted for</span>
      <select
        ref = "timescale-selector"
        :value = "selectedTimescale"
        @change = "onSelectTimescale($event.target.value)"
        @click.stop
      >
        <option
          v-for = "timescale in activeTimescales"
          :value = "timescale.idx"
          :key = "timescale.idx"
        >
          {{ timescale.range | formatTimescale(fullTimescale) }}
        </option>
      </select>
      <span>
        (Issued {{ wxUpdated | formatTime }}):
      </span>
      <span
        :style = "{'font-weight': wxMode === 'time' ? 'bold' : 'normal'}"
        @click.prevent = "setMode('time')"
      >
        {{ wxTime | formatTime }}
      </span>
      <span
        :style = "{'font-weight': wxMode === 'offset' ? 'bold' : 'normal'}"
        @click.prevent = "setMode('offset')"
      >
        (+{{ timeOffset | formatOffset }})
      </span>
      <button
        v-if = "playTimer === null"
        @click.prevent = "onPlay"
      >
        &#9654;
      </button>
      <button
        v-if = "playTimer !== null"
        @click.prevent = "cancelPlay"
      >
        &#9642;
      </button>
      <span>Use</span>
      <select
        ref = "step-selector"
        :value = "selectedStep"
        @change = "onSelectStep($event.target.value)"
        @click.stop
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
      <button
        @click.prevent = "changeTime(selectedStep)"
      >
        &#9654;&#9654;
      </button>
      <button
        @click.prevent = "setTime(offsetMax)"
      >
        &#9654;&#124;
      </button>
    </div>
  </form>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { daysToMsec, hToMsec, minToMsec, msecToDays, msecToH, msecToMin, msecToUTCHourMinString } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import { eventMap } from '../../lib/events.js';
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
      draggingSlider: null,

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
      wxMode: state => state.weather.mode,
      wxUpdated: state => state.weather.data.updated,
      wxStartMode: state => state.weather.cfg.startMode.value,
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
      return days[d.getUTCDay()] + " " + msecToUTCHourMinString(d) + "utc";
    },
    formatOffset (value) {
      const h = msecToH(value);
      let d = msecToDays(value);
      let hTxt = roundToFixed(h - Math.floor(d) * 24, 1);
      if (hTxt === '24.0') {
        d += 1;
        hTxt = '0.0';
      }
      return (d < 1 ? '' : (Math.floor(d) + 'd')) + hTxt + 'h';
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
    focusPanel () {
      this.$refs['weatherslider'].focus();
    },
    onSelectTimescale (value) {
      if (this.selectedTimescale !== parseInt(value)) {
        this.selectedStep = this.weatherTimescales[value].defaultStep;
      }
      this.selectedTimescale = value;
      if (this.timeOffset > this.offsetMax) {
        this.setTime(this.offsetMax);
      }
      this.$refs['timescale-selector'].blur();
      this.focusPanel();
    },
    onSelectStep (value) {
      if (this.selectedStep !== parseInt(value)) {
        this.selectedStep = parseInt(value);
      }
      this.$refs['step-selector'].blur();
      this.focusPanel();
    },
    setTime (value) {
      this.$store.commit('weather/setTime', this.boatTime + value);
      this.focusPanel();
    },
    setMode (value) {
      this.$store.commit('weather/setMode', value);
      this.focusPanel();
    },
    changeTime (delta) {
      if (!this.wxLoaded || !this.wxValidTimeseries) {
        return;
      }
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
      ev.preventDefault();
      if (!this.wxLoaded) {
        return;
      }
      this.draggingSlider = ev.type;
      window.addEventListener(eventMap[this.draggingSlider].move,
                              this.onMouseMove);
      this.onDragTo(ev);
    },
    onMouseUp (ev) {
      if ((this.draggingSlider !== null) &&
          (eventMap[this.draggingSlider].end === ev.type)) {
        this.endDragging();
      }
    },
    endDragging () {
      window.removeEventListener(eventMap[this.draggingSlider].move,
                                 this.onMouseMove);
      this.draggingSlider = null;
    }
  },
  mounted () {
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('touchend', this.onMouseUp);
    this.$store.commit('weather/setMode', this.wxStartMode);
  },
  beforeDestroy () {
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('touchend', this.onMouseUp);
    if (this.draggingSlider !== null) {
      this.endDragging();
    }
  },
}
</script>

<style scoped>
#weather-panel {
  width: 630px;
  border: 1px solid rgba(220, 220, 220, 0.8);
  border-bottom: 0px;
  border-radius: 5px 5px 0 0;
}
#weather-slider-container {
  position: relative;
  width: 100%;
}
#weather-slider {
  position: relative;
  width: 100%;
  background-image: linear-gradient(rgba(234, 234, 234, 0.8), rgba(191, 191, 191, 0.8), rgba(234, 234, 234, 0.8));
  border-radius: 5px 5px 2px 2px;
  touch-action: none;
}
#weather-slider-fg {
  position: absolute;
  background-image: linear-gradient(rgba(85, 149, 191, 0.8), rgba(85, 191, 255, 0.8), rgba(85, 149, 191, 0.8));
  border-radius: 5px;
}
#weather-slider, #weather-slider-fg {
  height: 9px;
}
#weather-slider:focus {
  outline: none;
}
#weather-panel-control, #weather-panel-placeholder {
  background: rgba(200, 200, 200, 0.8);
}
#weather-panel-control span {
  font-size: 11px;
  padding: 1px;
  user-select: none;
}
#weather-panel-control button,select {
  border: none;
  padding: 1px;
  margin: 0px;
  font-size: 11px;
}
#weather-panel-control button {
  background: #ffffff;
  touch-action: none;
}
#weather-panel-control select option {
  border: none;
  padding: 0px;
  margin: 0px;
  font-size: 11px;
}
</style>
