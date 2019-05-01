import L from 'leaflet';
import { speedTowardsBearing, gcCalc, twaTextPrefix } from '../../lib/nav.js';
import { roundToFixed } from '../../lib/hacks.js';
import { MS_TO_KNT } from '../../lib/sol.js';
import { configSetValue } from '../../components/config/configstore.js';

function defaultFormat (instrument) {
  return roundToFixed(instrument.value * instrument.mult, instrument.decimals);
}

function twaFormat (instrument) {
  return twaTextPrefix(instrument.value) + defaultFormat(instrument);
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
      decimals: 3,
      format: defaultFormat,
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
      decimals: 3,
      format: defaultFormat,
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
      decimals: 2,
      format: defaultFormat,
    },
    course: {
      value: null,
      name: "COURSE",
      unit: "\xb0",
      datafield: "cog",
      mult: 180 / Math.PI,
      decimals: 2,
      format: defaultFormat,
    },
    twa: {
      value: null,
      name: "TWA",
      unit: "\xb0",
      datafield: "twa",
      mult: 180 / Math.PI,
      decimals: 2,
      format: twaFormat,
    },
    twd: {
      value: null,
      name: "TWD",
      unit: "\xb0",
      datafield: "twd",
      mult: 180 / Math.PI,
      decimals: 2,
      format: defaultFormat,
    },
    tws: {
      value: null,
      name: "TWS",
      unit: "kn",
      datafield: "tws",
      mult: MS_TO_KNT,
      decimals: 2,
      format: defaultFormat,
    },
    vmg: {
      value: null,
      name: "VMG",
      unit: "kn",
      mult: 1,
      calculate: (data) => {
        return speedTowardsBearing(data.speed.value,
                                   data.course.value,
                                   data.twd.value);
      },
      decimals: 2,
      format: defaultFormat,
    },
    vmc: {
      value: null,
      name: "VMC",
      unit: "kn",
      mult: 1,
      calculate: (data, rootGetters) => {
        const gcPath = gcCalc(L.latLng(data.lat.value, data.lon.value),
                               rootGetters['race/nextWaypoint'].latLng);
        return speedTowardsBearing(data.speed.value,
                                   data.course.value,
                                   gcPath.startBearing);
      },
      decimals: 2,
      format: defaultFormat,
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
      decimals: 2,
      format: defaultFormat,
    },
    // DATE
    // TIME
    time: {
      value: 0,
      name: "TIME",
      unit: "UTC",
      datafield: 'time',
      format: (instrument) => {
        if (instrument.value === 0) {
          return '--:--';
        }
        const d = new Date(instrument.value);
        return ("0" + d.getUTCHours()).slice(-2) + ':' +
               ("0" + d.getUTCMinutes()).slice(-2);
      },
    },
    date: {
      value: 0,
      name: "DATE",
      unit: "UTC",
      datafield: 'time',
      format: (instrument) => {
        if (instrument.value === 0) {
          return '--/--';
        }
        const d = new Date(instrument.value);
        return ("0" + (d.getUTCMonth() + 1)).slice(-2) + '/' +
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
    updateInstruments ({state, rootGetters, commit}, data) {
      let updateList = {};

      for (let i of state.list) {
        let val;
        if (typeof state[i].calculate !== 'undefined') {
          val = state[i].calculate(updateList, rootGetters);
        } else {
          val = data[state[i].datafield];
        }
        if (typeof state[i].notNum === 'undefined') {
          val = parseFloat(val);
          if (!Number.isFinite(val)) {
            val = undefined;
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
