import L from 'leaflet';
import { minToMsec, MONTHS_TXT } from '../../lib/utils.js';
import { speedTowardsBearing, gcCalc, twaTextPrefix } from '../../lib/nav.js';
import { roundToFixed } from '../../lib/quirks.js';
import { MS_TO_KNT } from '../../lib/sol.js';
import { formatCoordinate } from '../../lib/format.js';
import { configSetValue } from '../../components/config/configstore.js';

const API_DOWN_DELAY = minToMsec(1);
const activeSteeringColor = 'rgba(255, 255, 0, 0.6)';

function defaultFormat (value, instrument, state) {
  const decimals = Math.max(instrument.minDecimals,
                            state.boat.instruments.cfg.instrumentDecimals.value);
  return roundToFixed(value * instrument.mult, decimals);
}

function twaFormat (value, instrument, state) {
  return twaTextPrefix(value) + defaultFormat(value, instrument, state);
}

const snHemispheres = ['S', 'N'];
const weHemispheres = ['W', 'E'];

function latFormat (value, instrument, state) {
  return formatCoordinate(value, snHemispheres,
                          instrument.minDecimals,
                          state.ui.cfg.coordinateFormat.value);
}

function lonFormat (value, instrument, state) {
  return formatCoordinate(value, weHemispheres,
                          instrument.minDecimals,
                          state.ui.cfg.coordinateFormat.value);
}

export default {
  namespaced: true,
  state: {
    lat: {
      value: null,
      name: "LAT",
      unit: "\xb0",
      datafield: "lat",
      mult: 1,
      minDecimals: 4,
      format: latFormat,
      enabled: {
        value: false,
        type: 'boolean',
        cfgText: 'LAT',
      },
    },
    lon: {
      value: null,
      name: "LON",
      unit: "\xb0",
      datafield: "lon",
      mult: 1,
      minDecimals: 4,
      format: lonFormat,
      enabled: {
        value: false,
        type: 'boolean',
        cfgText: 'LON',
      },
    },
    speed: {
      value: null,
      name: "SPEED",
      unit: "kn",
      datafield: "sog",
      mult: 1,
      minDecimals: 1,
      format: defaultFormat,
    },
    course: {
      value: null,
      name: "COURSE",
      unit: "\xb0",
      datafield: "cog",
      mult: 180 / Math.PI,
      minDecimals: 1,
      format: defaultFormat,
      bgColor: function (instrument, state) {
        if (instrument.value !== null && state.boat.currentSteering === 'cc') {
          return activeSteeringColor;
        }
        return null;
      },
    },
    twa: {
      value: null,
      name: "TWA",
      unit: "\xb0",
      datafield: "twa",
      mult: 180 / Math.PI,
      minDecimals: 1,
      format: twaFormat,
      bgColor: function (instrument, state) {
        if (instrument.value !== null && state.boat.currentSteering === 'twa') {
          return activeSteeringColor;
        }
        return null;
      },
    },
    twd: {
      value: null,
      name: "TWD",
      unit: "\xb0",
      datafield: "twd",
      mult: 180 / Math.PI,
      minDecimals: 1,
      format: defaultFormat,
    },
    tws: {
      value: null,
      name: "TWS",
      unit: "kn",
      datafield: "tws",
      mult: MS_TO_KNT,
      minDecimals: 1,
      format: defaultFormat,
    },
    vmg: {
      name: "VMG",
      unit: "kn",
      mult: 1,
      calculate: function (state) {
        if (state.speed.value === null) {
          return null;
        }
        return speedTowardsBearing(state.speed.value,
                                   state.course.value,
                                   state.twd.value);
      },
      minDecimals: 1,
      format: defaultFormat,
    },
    vmc: {
      name: "VMC",
      unit: "kn",
      mult: 1,
      calculate: function (state, rootGetters) {
        if (state.speed.value === null) {
          return null;
        }
        const gcPath = gcCalc(L.latLng(state.lat.value, state.lon.value),
                               rootGetters['ui/currentTarget'].latLng);
        return speedTowardsBearing(state.speed.value,
                                   state.course.value,
                                   gcPath.startBearing);
      },
      minDecimals: 1,
      format: defaultFormat,
      color: function (instrument, state) {
        if (state.ui.poi.targetId !== -1) {
          return 'red';
        }
        return null;
      },
      enabled: {
        value: false,
        type: 'boolean',
        cfgText: 'VMC',
      },
    },
    perf: {
      value: null,
      name: "PERF",
      unit: "%",
      datafield: "efficiency",
      mult: 100,
      minDecimals: 1,
      format: defaultFormat,
    },
    // DATE
    // TIME
    time: {
      value: 0,
      name: "TIME",
      unit: "UTC",
      datafield: 'time',
      format: function (value) {
        if (value === 0) {
          return '--:--';
        }
        const d = new Date(value);
        return ("0" + d.getUTCHours()).slice(-2) + ':' +
               ("0" + d.getUTCMinutes()).slice(-2);
      },
      apiDownDelay: API_DOWN_DELAY,
      color: function (instrument, state) {
        if ((instrument.value > 0) &&
            (instrument.value + instrument.apiDownDelay < state.time.realTime)) {
          return 'red';
        }
        return null;
      },
    },
    date: {
      value: 0,
      name: "DATE",
      unit: "UTC",
      datafield: 'time',
      format: function (value) {
        if (value === 0) {
          return '--/--';
        }
        const d = new Date(value);
        return MONTHS_TXT[d.getUTCMonth()] + ' ' +
               ("0" + d.getUTCDate()).slice(-2);
      },
      enabled: {
        value: true,
        type: 'boolean',
        cfgText: 'DATE',
      },
    },

    list: [
      'lat', 'lon', 'speed', 'course', 'twa', 'twd', 'tws', 'vmg', 'vmc',
      'perf',
      'date', 'time',
    ],

    cfg: {
      instrumentDecimals: {
        value: 2,
        type: 'range',
        low: 1,
        high: 3,
        cfgText: 'Number of decimals in instrument',
      },
      visualizePolar: {
        value: false,
        type: 'boolean',
        cfgText: 'Always show current polar butterfly visually',
      }
    },
  },
  mutations: {
    initTime (state, time) {
      state.time.value = time;
      state.date.value = time;
    },
    updateInstruments (state, updateList) {
      for (let i of state.list) {
        state[i].value = updateList[i].value;
      }
    },
    configSetValue,
  },
  actions: {
    updateInstruments ({state, commit}, data) {
      let updateList = {};

      for (let i of state.list) {
        let val;
        if (typeof state[i].calculate === 'undefined') {
          val = data[state[i].datafield];
          if (typeof state[i].notNum === 'undefined') {
            val = parseFloat(val);
            if (!Number.isFinite(val)) {
              val = undefined;
            }
          }
        }

        updateList[i] = {
          value: val,
        };
      }
      commit('updateInstruments', updateList);
    },
  }
}
