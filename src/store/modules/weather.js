import L from 'leaflet';
import { store } from '../../store/index.js';
import { UTCToMsec, hToMsec, secToMsec, msecToUTCHourMinString, interpolateFactor, linearInterpolate, bsearchLeft } from '../../lib/utils.js';
import { UVToWind } from '../../lib/sol.js';
import { configSetValue } from '../../components/config/configstore.js';
import { lowPrioTask } from '../../lib/lowprio.js';

/*
 * These are outside of reactive parts as they're large arrays
 * and performance critical
 */
let timeSeries = [];
/* format: [layer]
 *   name
 *   updated
 *   url
 *   timeSeries: []
 *   ...
 *   windMap: [time][lon][lat][u,v]
 */
export let weatherData = [];

function findWeatherLayer(url) {
  for (let layer of weatherData) {
    if (layer.url === url) {
      return layer;
    }
  }
  return null;
}

function checkTimeIdx(idx, timestamp) {
  return timeSeries[idx] <= timestamp && timestamp <= timeSeries[idx+1];
}

function __latLngWind(latLng, weatherLayer, timeIdx) {
  const wxLat = latLng.lat;
  let wxLng = latLng.lng;
  /* Try to dewrap into wx coordinate area */
  while (wxLng >= weatherLayer.boundary.getNorthEast().lng) {
    wxLng -= 360;
  }
  while (wxLng < weatherLayer.origo[1]) {
    wxLng += 360;
  }
  /*
   * .contains() doesn't prevent access to undefined item at race boundary
   * so we have to do the checks manually. Lng is linearized above, thus
   * only >= check is needed for it.
   */
  if ((wxLng >= weatherLayer.boundary.getNorthEast().lng) ||
      (wxLat < weatherLayer.boundary.getSouthWest().lat) ||
      (wxLat >= weatherLayer.boundary.getNorthEast().lat)) {
    return null;
  }

  const windMap = weatherLayer.windMap;

  const lonIdx = Math.floor((wxLng - weatherLayer.origo[1]) / weatherLayer.cellSize[1]);
  const latIdx = Math.floor((wxLat - weatherLayer.origo[0]) / weatherLayer.cellSize[0]);

  /* latitude (y) solution */
  let firstRes = [[], []];
  const firstFactor = interpolateFactor(
    latIdx * weatherLayer.cellSize[0] + weatherLayer.origo[0],
    wxLat,
    (latIdx + 1) * weatherLayer.cellSize[0] + weatherLayer.origo[0]
  );
  for (let t = 0; t <= 1; t++) {
    for (let x = 0; x <= 1; x++) {
      firstRes[t][x] = wxLinearInterpolate(
        firstFactor,
        windMap[timeIdx+t][lonIdx+x][latIdx],
        windMap[timeIdx+t][lonIdx+x][latIdx+1]
      );
    }
  }

  /* longitude (x) solution */
  let secondRes = [];
  const secondFactor = interpolateFactor(
    lonIdx * weatherLayer.cellSize[1] + weatherLayer.origo[1],
    wxLng,
    (lonIdx + 1) * weatherLayer.cellSize[1] + weatherLayer.origo[1]
  );
  for (let t = 0; t <= 1; t++) {
      secondRes[t] = wxLinearInterpolate(
        secondFactor,
        firstRes[t][0],
        firstRes[t][1]
      );
  }
  return secondRes;
}

export function latLngWind(latLng, timestamp = null) {
  if (!state.dataStamp) {
    return null;
  }

  if (timestamp === null) {
    timestamp = state.time;
  }

  const weatherLayer = weatherData[0];
  let timeIdx = weatherLayer.cachedTimeIdx;

  if (!checkTimeIdx(timeIdx, timestamp)) {
    timeIdx++;
    if (!checkTimeIdx(timeIdx, timestamp)) {
      timeIdx = bsearchLeft(weatherLayer.timeSeries, timestamp) - 1;
      if (!checkTimeIdx(timeIdx, timestamp)) {
        return null;
      }
    }
  }
  weatherLayer.cachedTimeIdx = timeIdx;

  const secondRes = __latLngWind(latLng, weatherLayer, timeIdx);
  if (secondRes === null) {
    return null;
  }
  /* time (z) solution */
  const thirdFactor = interpolateFactor(
    timeSeries[timeIdx],
    timestamp,
    timeSeries[timeIdx+1],
  );
  return UVToWind(wxTimeInterpolate(
    thirdFactor,
    secondRes[0],
    secondRes[1]
  ));
}

const state = {
  loaded: false,
  time: 0,
  minTime: 0,
  mode: 'time',
  fetchTime: 0,
  fetchPeriod: {
    hot: {
      minWait: 30,
      variation: 60,
    },
    cold: {
      minWait: 3 * 60,
      variation: 10 * 60,
    },
  },
  updateTimes: [4*60 + 30, 10*60 + 30, 16*60 + 30, 22*60 + 30],
  dataStamp: 0,
  updated: null,
  firstTimestamp: 0,
  lastTimestamp: 0,
  cfg: {
    arrowsBarbs: {
      value: 'arrows',
      type: 'values',
      values: ['arrows', 'barbs', 'none'],
      cfgText: 'Wind arrows / barbs',
    },
    sound: {
      value: false,
      type: 'boolean',
      cfgText: 'New weather sound',
    },
    start24h: {
      value: false,
      type: 'boolean',
      cfgText: 'Start with 24h weather',
    },
    startStep: {
      value: '3',
      type: 'values',
      values: [
        ['0.5', '30 min'],
        ['1', '1 h'],
        ['2', '2 h'],
        ['3', '3 h'],
      ],
      cfgText: 'Start with weather step',
    },
    startMode: {
      value: 'time',
      type: 'values',
      values: [
        ['time', 'keep time constant'],
        ['offset', 'keep offset constant'],
      ],
      cfgText: 'Start with time/offset mode',
    },
    gridInterval: {
      value: 48,
      type: 'range',
      low: 24,
      high: 128,
      lowText: 'high',
      highText: 'low',
      reverse: true,
      cfgText: 'Wind grid density',
    },
    twsDensity: {
      value: 2,
      type: 'range',
      low: 0,
      high: 4,
      lowText: 'off',
      highText: 'high',
      cfgText: 'Wind speed contours density',
    },
    twsTxt: {
      value: false,
      type: 'boolean',
      cfgText: 'Show wind speed',
    },
    twdTxt: {
      value: false,
      type: 'boolean',
      cfgText: 'Show wind direction',
    },
    quickAccessButtons: {
      value: false,
      type: 'boolean',
      cfgText: 'Quick-access buttons for TWS/TWD'
    },
  },
};

function wxLinearInterpolate(factor, startData, endData) {
  return [
    linearInterpolate(factor, startData[0], endData[0]),
    linearInterpolate(factor, startData[1], endData[1]),
  ];
}

function wxTimeInterpolate(factor, startData, endData) {
  const fEnd = -2 * Math.pow(factor, 3) + 3 * Math.pow(factor, 2)
  const fStart = 1 - fEnd;

  return [
    fStart * startData[0] + fEnd * endData[0],
    fStart * startData[1] + fEnd * endData[1],
  ];
}

/* Bounds the given time between wx data range, return null if no bound
 * applies
 */
function boundTime(time) {
  if (state.loaded) {
    if (time < state.minTime) {
      return state.minTime;
    } else if (time < state.firstTimestamp) {
      return state.firstTimestamp;
    } else if (time > state.lastTimestamp) {
      return Math.max(state.lastTimestamp, state.minTime);
    }
  }
  return null;
}

const contourDefs = [
  [],
  [6, 12, 20, 30, 40, 50],
  [3, 6, 9, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100],
  [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 45, 50, 55, 60, 70, 80, 90, 100
  ],
  [
    0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
    5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5,
    10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50,
    55, 60, 65, 70, 75, 80, 85, 90, 95, 100
  ],
];

export default {
  namespaced: true,

  state,
  mutations: {
    initTime(state, time) {
      if (state.minTime === 0 || state.minTime === state.time) {
        state.time = time;
        state.minTime = time;
      }
    },
    setupLayer(state, layerInfo) {
      let weatherLayer = findWeatherLayer(layerInfo.name);
      if (weatherLayer !== null) {
        return;
      }

      weatherLayer = {
        name: layerInfo.name,
        updated: layerInfo.updated,
        url: layerInfo.url,
        boundary: layerInfo.boundary,
        timeSeries: null,
        origo: layerInfo.origo,
        cellSize: layerInfo.cellSize,
        cells: layerInfo.cells,
        cachedTimeIdx: 0,
        windMap: [],
      }
      weatherData[weatherData.length] = weatherLayer;
    },
    updateTile(state, weatherTile) {
      const weatherLayer = weatherTile.weatherLayer;
      if (weatherLayer.timeSeries === null) {
        weatherLayer.timeSeries = weatherTile.timeSeries;
      }
      weatherLayer.windMap = weatherTile.windMap;
    },
    update(state, weatherLayer) {
      state.dataStamp++;

      weatherData = weatherData.filter((layer) => layer.url !== weatherLayer.url);
      weatherData[0] = weatherLayer;

      state.firstTimestamp = weatherLayer.timeSeries[0];
      state.lastTimestamp = weatherLayer.timeSeries[weatherLayer.timeSeries.length - 1];
      timeSeries = weatherLayer.timeSeries;
      if (state.updated === null || weatherLayer.updated > state.updated) {
        state.updated = weatherLayer.updated;
      }
      state.loaded = true;
      /* wx begins only after our current timestamp or the new wx had an
       * error that truncated it such that the current wx time is beyond
       * the tail of the wx, fix the wx time index to avoid issues
       */
      const boundedTime = boundTime(state.time);
      if (boundedTime !== null) {
        store.dispatch(
          'diagnostics/add',
          "WARNING: time outside boattime/wx, fixing: " + state.time + " vs " + state.firstTimestamp + "-" + state.lastTimestamp
        );
        if (state.time !== boundedTime) {
          state.time = boundedTime;
        }
      }
    },
    boatTimeUpdated(state, timeData) {
      state.minTime = timeData.newTime;

      let newTime = timeData.newTime;

      if ((state.mode === 'offset') && (state.time > 0) && (timeData.delta !== null)) {
        newTime = state.time + timeData.delta;
      }
      if (state.loaded) {
        const boundedMinTime = boundTime(newTime);
        if (boundedMinTime !== null) {
          newTime = boundedMinTime;
        }
      }
      if ((state.mode === 'offset') || (state.time < newTime)) {
        state.time = newTime;
      }
    },
    setTime(state, time) {
      if (state.loaded) {
        const boundedTime = boundTime(time);
        if (boundedTime !== null) {
          time = boundedTime;
        }
        state.time = time;
      }
    },
    setMode(state, mode) {
      state.mode = mode;
    },
    setUpdateTimes(state, updateTimes) {
      state.updateTimes = updateTimes;
    },
    updateFetchTime(state, fetchTime) {
      state.fetchTime = fetchTime;
    },
    resetTime(state, clock) {
      if (state.fetchTime !== 0 && Math.abs(clock.offsetDelta) > secToMsec(60)) {
        state.fetchTime = clock.now;
      }
    },
    configSetValue,
  },

  getters: {
    dataTimescale: (state) => {
      return state.lastTimestamp - state.minTime;
    },
    valid: (state) => {
      return state.loaded &&
             (state.firstTimestamp <= state.minTime) &&
             (state.lastTimestamp > state.minTime);
    },

    twsContours: (state, getters, rootState) => {
      let val = state.cfg.twsDensity.value;

      if (rootState.map.zoom <= 5) {
        val = Math.min(val, state.cfg.twsDensity.high - 1);
      }

      return contourDefs[val];
    },

    timeIndex: (state, getters) => {
      let idx;

      state.dataStamp;

      /* Short-circuit for the common case near the beginning of the wx series */
      if (state.time <= timeSeries[1]) {
        idx = 0;
      } else {
        idx = bsearchLeft(timeSeries, state.time, 2, timeSeries.length - 1) - 1;
      }
      /* Sanity check frames */
      if ((idx < 0) || (timeSeries.length < idx+1)) {
        return null;
      }
      /* For now, check that the result is valid, */
      if (!checkTimeIdx(idx, state.time)) {
        /* Warn only when it's a bug. If wx data is invalid, no log spam */
        if (getters.valid) {
          store.dispatch(
            'diagnostics/add',
            "WX time-search out-of-range: " + timeSeries[idx] + "<=" + state.time + "<=" + timeSeries[idx+1] + "?!?"
          );
        }
        return null;
      }
      return idx;
    },
    timeIndexAny: (state, getters) => (timestamp) => {
      let idx;

      state.dataStamp;

      /* Short-circuit for the common case near the beginning of the wx series */
      if (timestamp <= timeSeries[1]) {
        idx = 0;
      } else {
        let min = 2;
        let max = timeSeries.length - 1;
        if (timeSeries[getters.timeIndex+1] < timestamp) {
          min = getters.timeIndex + 2;
        } else if (timeSeries[getters.timeIndex] > timestamp) {
          max = getters.timeIndex;
        }

        idx = bsearchLeft(timeSeries, timestamp, min, max) - 1;
      }
      /* Sanity check frames */
      if ((idx < 0) || (timeSeries.length < idx+1)) {
        return null;
      }

      /* For now, check that the result is valid, */
      if (!checkTimeIdx(idx, timestamp)) {
        /* Warn only when it's a bug. If wx data is invalid, no log spam */
        if (getters.valid) {
          store.dispatch(
            'diagnostics/add',
            "WX time-search out-of-range: " + timeSeries[idx] + "<=" + timestamp + "<=" + timeSeries[idx+1] + "?!?"
          );
        }
        return null;
      }
      return idx;
    },


    latLngWind: (state) => (latLng, timestamp = null) => {
      if (!state.dataStamp) {
        return null;
      }

      return latLngWind(latLng, timestamp)
    },

    idxToCell: (state) => (latIdx, lonIdx) => {
      const weatherLayer = weatherData[0];
      const windMap = weatherLayer.windMap;

      if ((lonIdx < 0) || (lonIdx >= weatherLayer.cells[1]) ||
          (latIdx < 0) || (latIdx >= weatherLayer.cells[0])) {
        return null;
      }

      let timeIdx = weatherLayer.cachedTimeIdx;
      let timestamp = state.time;
      if (!checkTimeIdx(timeIdx, timestamp)) {
        timeIdx++;
        if (!checkTimeIdx(timeIdx, timestamp)) {
          timeIdx = bsearchLeft(weatherLayer.timeSeries, timestamp) - 1;
          if (!checkTimeIdx(timeIdx, timestamp)) {
            return null;
          }
        }
      }
      weatherLayer.cachedTimeIdx = timeIdx;

      let wind = [];

      /* time (z) solution */
      const timeFactor = interpolateFactor(
        timeSeries[timeIdx],
        timestamp,
        timeSeries[timeIdx+1],
      );

      for (let y = 0; y <= 1; y++) {
        for (let x = 0; x <= 1; x++) {
          wind.push(wxTimeInterpolate(
            timeFactor,
            windMap[timeIdx][lonIdx+x][latIdx+y],
            windMap[timeIdx+1][lonIdx+x][latIdx+y]
          ));
        }
      }

      return wind;
    },

    nextTimeToFetch: (state, getters, rootState, rootGetters) => {
      const now = rootGetters['time/now']();
      let fetchPeriod = state.fetchPeriod.cold;

      /* First fetch(es) failed so far, retry soon enough */
      if (state.updated === null) {
        fetchPeriod = state.fetchPeriod.hot;

      /* No hot periods within 1h from last wx update */
      } else if (state.updated + hToMsec(1) < now) {
        const d = new Date(now);
        const nowMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();

        for (let updateMinutes of state.updateTimes) {
          /* Same formula as in minTurnAngle (now in minutes) */
          const delta = (nowMinutes - updateMinutes + ((24+12)*60)) % (24*60) - (12*60);
          /* Hot period with +/-25 minutes around the given update time.
           * In practice, however, it won't start until the previous cold
           * timer expires (see the values below).
           */
          if (Math.abs(delta) < 25) {
            fetchPeriod = state.fetchPeriod.hot;
            break;
          }
        }
      }

      return state.fetchTime + secToMsec(fetchPeriod.minWait) +
             secToMsec(fetchPeriod.variation) * Math.random();
    },
  },

  actions: {
    // ADDME: when to fetch the next wx, add the support in a concurrency
    // safe way to avoid multiple overlapping weather fetches.
    fetchInfo ({rootState, rootGetters, dispatch, commit}) {
      const getDef = {
        apiCall: 'weather',
        url: rootState.race.info.weatherurl,
        params: {
          token: rootState.auth.token,
        },
        useArrays: false,
        dataField: 'weatherinfo',
      };
      if (rootGetters['solapi/isLocked']('weather')) {
        return;
      }
      commit('solapi/lock', 'weather', {root: true});

      dispatch('solapi/get', getDef, {root: true})
      .then(weatherInfo => {
        let dataUrl = weatherInfo.url;
        if (findWeatherLayer(dataUrl) !== null) {
          commit('solapi/unlock', 'weather', {root: true});
          commit('updateFetchTime', rootGetters['time/now']());
          return;
        }
        dispatch('fetchData', dataUrl);
      })
      .catch(err => {
        commit('solapi/unlock', 'weather', {root: true});
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
      });
    },

    async fetchData ({state, rootGetters, commit, dispatch}, dataUrl) {
      let getDef = {
        apiCall: 'weatherdata',
      };
      try {
        getDef = {
          apiCall: 'weatherdata',
          url: dataUrl,
          params: {},
          useArrays: false,
          dataField: 'weathersystem',
        };

        let weatherData = await dispatch('solapi/get', getDef, {root: true});
        const firstWeather = (state.updated === null);

        let boundary = L.latLngBounds(
          L.latLng(weatherData.$.lat_min, weatherData.$.lon_min),
          L.latLng(weatherData.$.lat_max, weatherData.$.lon_max));
        let cells = [parseInt(weatherData.$.lat_n_points) - 1,
                     parseInt(weatherData.$.lon_n_points) - 1];
        let origo = [parseFloat(weatherData.$.lat_min),
                     parseFloat(weatherData.$.lon_min)];
        let cellSize = [parseFloat(weatherData.$.lat_increment),
                         parseFloat(weatherData.$.lon_increment)];

        const updated = UTCToMsec(weatherData.$.last_updated);
        if (updated === null) {
          dispatch(
            'diagnostics/add',
            'DATA ERROR: Invalid date in weather data: ' + weatherData.$.last_updated,
            {root: true}
          );
          return;
        }

        for (let frame of weatherData.frames.frame) {
          frame.utc = UTCToMsec(frame.$.target_time);
          if (frame.utc === null) {
            dispatch(
              'diagnostics/add',
              'DATA ERROR: Invalid date in weather data: ' + frame.$.target_time,
              {root: true}
            );
            return;
          }
        }

        weatherData.frames.frame.sort((a, b) => { return a.utc - b.utc; });

        let timeSeries = [];
        let windMap = [];
        /* FIXME: It takes quite long time to parse&mangle the arrays here,
         * perhaps use vue-worker for this but then also xml2js parsing will
         * consume lots of time. My initial attempt failed on lacking
         * this.$worker for solapi side so the JS syntax needs to solved
         * for this conversion to take place.
         */
        for (let frame of weatherData.frames.frame) {
          timeSeries.push(frame.utc);

          let u = frame.U.trim().split(/;\s*/);
          let v = frame.V.trim().split(/;\s*/);
          if ((u.length !== cells[1] + 2) || (u.length !== v.length)) {
            dispatch(
              'diagnostics/add',
              'DATA ERROR: Inconsistent weather lengths: ' +
              (cells[1] + 2) + ' ' + u.length + ' ' + v.length,
              {root: true}
            );
            return;
          }

          let windFrame = [];
          for (let i = 0; i < u.length-1; i++) {
            if (u[i] === '') {
              break;
            }

            let uu = u[i].trim().split(/\s+/);
            let vv = v[i].trim().split(/\s+/);

            if ((uu.length !== cells[0] + 2) && (uu.length !== vv.length)) {
              dispatch(
                'diagnostics/add',
                'DATA ERROR: Inconsistent weather lengths: ' +
                (cells[0] + 2) + ' ' + uu.length + ' ' + vv.length,
                {root: true}
              );
              return;
            }

            /* Construct last-level [u, v] arrays */
            let windRow = [];
            for (let j = 0; j < uu.length; j++) {
              let tmp = [parseFloat(uu[j]), parseFloat(vv[j])];
              windRow.push(Object.freeze(tmp));
            }
            windFrame.push(Object.freeze(windRow));
          }
          windMap.push(Object.freeze(windFrame));
          await lowPrioTask.idle();
        }
        windMap = Object.freeze(windMap);

        /* Improve performance by freezing all interpolation related
         * array objects. This avoid adding unnecessary reactivity detectors.
         */
        timeSeries = Object.freeze(timeSeries);
        origo = Object.freeze(origo);
        cellSize = Object.freeze(cellSize);
        cells = Object.freeze(cells);
        boundary = Object.freeze(boundary);

        let weatherLayerInfo = {
          name: '',
          updated: updated,
          url: dataUrl,
          boundary: boundary,
          origo: origo,
          cellSize: cellSize,
          cells: cells,
        };
        commit('setupLayer', weatherLayerInfo);

        const weatherTile = {
          weatherLayer: findWeatherLayer(dataUrl),
          timeSeries: timeSeries,
          windMap: windMap,
        };
        commit('updateTile', weatherTile);
        commit('update', weatherTile.weatherLayer);

        const now = rootGetters['time/now']();
        commit('updateFetchTime', now);
        if (!firstWeather) {
          const d = new Date(state.updated);
          dispatch('notifications/add', {
            text: 'Weather updated at ' + msecToUTCHourMinString(d),
          }, {root: true});
        }
      } catch(err) {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
      } finally {
        commit('solapi/unlock', 'weather', {root: true});
      }
    },
    parseUpdateTimes({commit, dispatch}, description) {
      const regex = /WX  *[Uu]pdates: *(<br>)* *([0-2][0-9][0-5][0-9]) *\/ *([0-2][0-9][0-5][0-9]) *\/ *([0-2][0-9][0-5][0-9]) *\/ *([0-2][0-9][0-5][0-9])\.* *(<br>)*/;
      const w = regex.exec(description);
      if (w === null) {
        dispatch(
          'diagnostics/add',
          'DATA WARNING: No WX update times found in description!',
          {root: true}
        );
        return;
      }
      let times = [];
      for (let i = 2; i <= 5; i++) {
        let time = +('1' + w[i]);
        if ((time < 10000) || (12400 < time)) {
          dispatch(
            'diagnostics/add',
            'DATA ERROR: Invalid WX update time: ' + w[i],
            {root: true}
          );
          return;
        }
        time -= 10000;
        const wxMinutes = Math.floor(time / 100) * 60 + (time % 100);
        times.push(wxMinutes);
      }
      commit('setUpdateTimes', times);
    },
  },
}
