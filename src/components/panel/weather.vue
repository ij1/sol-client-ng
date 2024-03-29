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
        @mousedown = "onDragStart"
        @touchstart = "onDragStart"
      >
        <div
          id = "weather-slider-fg"
          :style = "{width: 'calc((100% - ' + sliderZeroPx + 'px) * ' + timeFrac + ' + ' + sliderZeroPx + 'px)'}"
        />
      </div>
      <div
        v-for = "tic in timeTics"
        class = "weather-slider-tic"
        :key = "'t' + tic.timestamp"
        :style = "tic.style"
      />
      <div
        v-for = "tic in wxTics"
        class = "weather-slider-tic"
        :key = "'w' + tic.timestamp"
        :style = "tic.style"
      />
      <div
        v-if = "startTic !== null"
        class = "weather-slider-tic"
        :style = "startTic"
      />
    </div>
    <div id="weather-panel-placeholder" v-if="!wxLoaded">
      <span class = "weather-panel-control-padding"/>
      Waiting for the weather information to load...
      <span class = "weather-panel-control-padding"/>
    </div>
    <div id="weather-panel-placeholder" v-if="wxLoaded && !wxValid">
      <span class = "weather-panel-control-padding"/>
      Weather information is truncated...
      <span class = "weather-panel-control-padding"/>
    </div>
    <div id="weather-panel-control" v-if="wxLoaded && wxValid">
      <span class = "weather-panel-control-padding"/>
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
          {{ formatTimescale(timescale.range, fullTimescale) }}
        </option>
      </select>
      <span>
        (Issued {{ formatTime(wxUpdated) }}):
      </span>
      <span class = "text-placeholder-container">
        <span class = "text-dummy">
          May 29 29:59utc
        </span>
        <span
          class = "text-real"
          :style = "{'font-weight': wxMode === 'time' ? 'bold' : 'normal'}"
          @click.prevent = "setMode('time', $event)"
        >
          {{ formatTime(wxTime) }}
        </span>
      </span>
      <span class = "text-placeholder-container">
        <span class = "text-dummy">
          (+9d29.99h)
        </span>
        <span
          class = "text-real"
          :style = "{'font-weight': wxMode === 'offset' ? 'bold' : 'normal'}"
          @click.prevent = "setMode('offset', $event)"
        >
          (+{{ formatOffset(timeOffset) }})
        </span>
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
          {{ formatStep(step) }}
        </option>
      </select>
      <span>steps.</span>
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
      <span class = "weather-panel-control-padding"/>
    </div>
  </form>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { daysToMsec, hToMsec, minToMsec, msecToDays, msecToH, msecToMin, msecToUTCHourMinString, MONTHS_TXT } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import { eventMap } from '../../lib/events.js';
import L from 'leaflet';

export default {
  name: 'WeatherPanel',
  data () {
    return {
      /* 24h / max (this.weatherTimescales.length - 1) */
      selectedTimescale: this.$store.state.weather.cfg.start24h.value ? 1 : 3,
      selectedStep: hToMsec(+this.$store.state.weather.cfg.startStep.value),
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
    timeMax () {
      return this.boatTime + this.offsetMax;
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
    timeTics () {
      let res = [];

      const ticStep = this.weatherTimescales[this.selectedTimescale].defaultStep;
      const ticMult = Math.ceil(Math.min(this.offsetMax / ticStep) / 16.0);
      const ticFinal = ticMult * ticStep;
      let tstamp = Math.ceil(this.boatTime / ticFinal) * ticFinal;

      while (tstamp <= this.timeMax) {
        res.push({
          timestamp: tstamp,
          style: {
            left: 'calc((100% - ' + this.sliderZeroPx + 'px) * ' +
                   ((tstamp - this.boatTime) / this.offsetMax) + ' + ' +
                   (this.sliderZeroPx / 2) + 'px)',
            'background': 'rgba(0, 0, 0, 0.6)',
          },
        });
        tstamp += ticFinal;
      }

      return res;
    },
    wxTics () {
      let res = [];

      let tstamp = Math.floor(this.boatTime / daysToMsec(1)) * daysToMsec(1);
      while (tstamp <= this.timeMax) {
        for (let updateSecs of this.wxUpdateTimes) {
          let updateTstamp = tstamp + minToMsec(updateSecs);
          if (updateTstamp > this.timeMax) {
            break;
          }
          if (updateTstamp >= this.boatTime) {
            res.push({
              timestamp: updateTstamp,
              style: {
                left: 'calc((100% - ' + this.sliderZeroPx + 'px) * ' +
                       ((updateTstamp - this.boatTime) / this.offsetMax) + ' + ' +
                       (this.sliderZeroPx / 2) + 'px)',
                'background': 'rgba(255, 0, 0, 0.6)',
                'z-index': 1,
              },
            });
          }
        }
        tstamp += daysToMsec(1);
      }

      return res;
    },
    startTic () {
      if (this.boatTime >= this.raceStartTime) {
        return null;
      }
      return {
        left: 'calc((100% - ' + this.sliderZeroPx + 'px) * ' +
               ((this.raceStartTime - this.boatTime) / this.offsetMax) + ' + ' +
               (this.sliderZeroPx / 2) + 'px)',
        background: 'rgba(0, 128, 0, 0.6)',
        width: '3px',
        'z-index': 2,
      };
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      wxTime: state => state.weather.time,
      wxMode: state => state.weather.mode,
      wxUpdated: state => state.weather.updated,
      wxUpdateTimes: state => state.weather.updateTimes,
      wxStartMode: state => state.weather.cfg.startMode.value,
      raceStartTime: state => state.race.info.startTime,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
      wxDataTimescale: 'weather/dataTimescale',
      wxValid: 'weather/valid',
    }),
  },

  methods: {
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
      const d = new Date(value);
      return MONTHS_TXT[d.getUTCMonth()] + " " +
             ("0" + d.getUTCDate()).slice(-2) + " " +
             msecToUTCHourMinString(d) + "utc";
    },
    formatOffset (value) {
      const h = msecToH(value);
      let d = msecToDays(value);
      let hTxt = roundToFixed(h - Math.floor(d) * 24, 2);
      if (hTxt === '24.00') {
        d += 1;
        hTxt = '0.00';
      }
      return (d < 1 ? '' : (Math.floor(d) + 'd')) + hTxt + 'h';
    },

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
    setMode (value, ev) {
      if (ev.altKey) {
        let offset = roundToFixed(this.timeOffset / (3600 * 1000.0), 2);
        this.$store.commit('boat/steering/setDelay', '' + offset);
        this.$store.commit('boat/steering/setDelayTime', offset);
        this.$store.commit('boat/steering/setDelayOn', true);
        this.$store.commit('ui/setActiveTab', 0);
        return;
      }
      this.$store.commit('weather/setMode', value);
      this.focusPanel();
    },
    changeTime (delta) {
      if (!this.wxValid) {
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
      if (ev.type.startsWith('touch')) {
        if (ev.touches.length > 1) {
          return;
        }
        ev = ev.touches[0];
      }
      const pt = L.DomEvent.getMousePosition(ev, this.$refs.weatherslider);
      const x = Math.floor(pt.x) - this.sliderZeroPx / 2;
      let frac = x / (this.$refs.weatherslider.offsetWidth - this.sliderZeroPx);
      if (isNaN(frac)) {
        return;
      }
      frac = Math.min(1, frac);
      frac = Math.max(0, frac);
      this.setTime(Math.round(frac * this.offsetMax));
    },
    onDragStart (ev) {
      ev.preventDefault();
      if (!this.wxValid) {
        return;
      }
      this.draggingSlider = ev.type;
      window.addEventListener(eventMap[this.draggingSlider].move,
                              this.onDragTo);
      window.addEventListener(eventMap[this.draggingSlider].end,
                              this.onDragStop);
      if (eventMap[this.draggingSlider].cancel !== null) {
        window.addEventListener(eventMap[this.draggingSlider].cancel,
                                this.onDragStop);
      }
      this.onDragTo(ev);
    },
    onDragStop (ev) {
      if ((this.draggingSlider !== null) &&
          (eventMap[this.draggingSlider].end === ev.type)) {
        this.endDragging();
      }
    },
    endDragging () {
      window.removeEventListener(eventMap[this.draggingSlider].move,
                                 this.onDragTo);
      window.removeEventListener(eventMap[this.draggingSlider].end,
                                 this.onDragStop);
      if (eventMap[this.draggingSlider].cancel !== null) {
        window.removeEventListener(eventMap[this.draggingSlider].cancel,
                                   this.onDragStop);
      }
      this.draggingSlider = null;
    }
  },
  mounted () {
    this.$store.commit('weather/setMode', this.wxStartMode);
  },
  beforeDestroy () {
    if (this.draggingSlider !== null) {
      this.endDragging();
    }
  },
}
</script>

<style scoped>
#weather-panel {
  position: relative;
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
#weather-slider:focus {
  border: 1px solid;
  border-radius: 5px 5px 4px 4px;
  color: rgba(255, 80, 80, 0.8);
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
.weather-slider-tic {
  position: absolute;
  top: 1px;
  height: calc(100% - 2px);
  width: 1px;
  pointer-events: none;
}
#weather-panel-control, #weather-panel-placeholder {
  background: rgba(200, 200, 200, 0.8);
}
#weather-panel-placeholder {
  min-width: 600px;
}
.weather-panel-control-padding {
  display: inline-block;
  min-width: 10px;
}
#weather-panel-control span {
  font-size: 11px;
  padding: 1px;
  user-select: none;
}
#weather-panel-control button,select {
  border: none;
  border-radius: 0px;
  padding: 1px;
  margin: 0px;
  font-size: 11px;
}
#weather-panel-control button {
  background: #ffffff;
  color: #000000;
  min-width: 10px;
  margin-left: 1px;
  margin-right: 1px;
  touch-action: none;
}
#weather-panel-control select option {
  border: none;
  padding: 0px;
  margin: 0px;
  font-size: 11px;
}
.text-placeholder-container {
  position: relative;
  top: 0;
  left: 0;
}
.text-dummy {
  opacity: 0;
  text-weight: bold;
  user-select: none;
}
.text-real {
  position: absolute;
  left: 0;
  top: 0;
}
</style>
