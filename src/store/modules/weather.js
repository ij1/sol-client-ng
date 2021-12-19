import Vue from 'vue';
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
/* format: [layer]
 *   name
 *   updated
 *   url
 *   timeSeries: []
 *   boundary
 *   origo
 *   tiled
 *   tileSize
 *   tiles
 *   tileCells
 *   cellSize
 *   cells
 *   cachedTimeIdx
 *   windMap: [lontile][lattile][time][lon][lat][u,v]
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

function checkTimeIdx(timeSeries, idx, timestamp) {
  return timeSeries[idx] <= timestamp &&
         idx + 1 < timeSeries.length &&
         timestamp <= timeSeries[idx+1];
}

let firstRes = [
  [
    [0, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
  ]
];
let secondRes = [
  [0, 0],
  [0, 0],
];
let thirdRes = [0, 0];

function __latLngWind(latLng, weatherLayer, timeIdx) {
  const origo = weatherLayer.origo;
  const boundary_ne = weatherLayer.boundary.getNorthEast();
  const wxLat = latLng.lat;
  let wxLng = latLng.lng;
  /* Try to dewrap into wx coordinate area */
  while (wxLng >= boundary_ne.lng) {
    wxLng -= 360;
  }
  while (wxLng < origo[1]) {
    wxLng += 360;
  }
  /*
   * .contains() doesn't prevent access to undefined item at race boundary
   * so we have to do the checks manually. Lng is linearized above, thus
   * only >= check is needed for it.
   */
  if ((wxLng >= boundary_ne.lng) ||
      (wxLat < origo[0]) ||
      (wxLat >= boundary_ne.lat)) {
    return null;
  }

  const tileSize = weatherLayer.tileSize;

  const lonTileVal = (wxLng - origo[1]) / tileSize[1];
  const latTileVal = (wxLat - origo[0]) / tileSize[0];
  const lonTileIdx = lonTileVal | 0;	/* Round down using bitops */
  const latTileIdx = latTileVal | 0;
  const windMap = weatherLayer.windMap[lonTileIdx][latTileIdx];
  if (windMap === null) {
    return null;
  }

  const lonVal = (lonTileVal - lonTileIdx) * weatherLayer.tileCells[1];
  const latVal = (latTileVal - latTileIdx) * weatherLayer.tileCells[0];
  const lonIdx = lonVal | 0;
  const latIdx = latVal | 0;

  /* latitude (y) solution */
  const firstFactor = latVal - latIdx;
  for (let t = 0; t <= 1; t++) {
    for (let x = 0; x <= 1; x++) {
      wxLinearInterpolate(
        firstFactor,
        windMap[timeIdx+t][lonIdx+x][latIdx],
        windMap[timeIdx+t][lonIdx+x][latIdx+1],
        firstRes[t][x]
      );
    }
  }

  /* longitude (x) solution */
  const secondFactor = lonVal - lonIdx;
  for (let t = 0; t <= 1; t++) {
      wxLinearInterpolate(
        secondFactor,
        firstRes[t][0],
        firstRes[t][1],
        secondRes[t]
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
  const timeSeries = weatherLayer.timeSeries;
  let timeIdx = weatherLayer.cachedTimeIdx;

  if (!checkTimeIdx(timeSeries, timeIdx, timestamp)) {
    timeIdx++;
    if (!checkTimeIdx(timeSeries, timeIdx, timestamp)) {
      timeIdx = bsearchLeft(timeSeries, timestamp, 1) - 1;
      if (!checkTimeIdx(timeSeries, timeIdx, timestamp)) {
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
    timeSeries[timeIdx+1]
  );
  wxTimeInterpolate(
    thirdFactor,
    secondRes[0],
    secondRes[1],
    thirdRes
  )
  return UVToWind(thirdRes);
}

export function idxToCell(latIdx, lonIdx) {
  const weatherLayer = weatherData[0];
  const tileCells = weatherLayer.tileCells;
  // FIXME: move these divides into caller domain
  const lonTileVal = lonIdx / tileCells[1];
  const latTileVal = latIdx / tileCells[0];
  const lonTileIdx = lonTileVal | 0;	/* Round down using bitops */
  const latTileIdx = latTileVal | 0;
  const windMap = weatherLayer.windMap[lonTileIdx][latTileIdx];
  if (windMap === null) {
    return null;
  }

  lonIdx -= lonTileIdx * tileCells[1];
  latIdx -= latTileIdx * tileCells[0]

  const timeSeries = weatherLayer.timeSeries;
  let timeIdx = weatherLayer.cachedTimeIdx;
  let timestamp = state.time;
  if (!checkTimeIdx(timeSeries, timeIdx, timestamp)) {
    timeIdx++;
    if (!checkTimeIdx(timeSeries, timeIdx, timestamp)) {
      timeIdx = bsearchLeft(timeSeries, timestamp, 1) - 1;
      if (!checkTimeIdx(timeSeries, timeIdx, timestamp)) {
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
      let res = [0, 0];
      wxTimeInterpolate(
        timeFactor,
        windMap[timeIdx][lonIdx+x][latIdx+y],
        windMap[timeIdx+1][lonIdx+x][latIdx+y],
        res
      )
      wind.push(res);
    }
  }

  return wind;
}

const state = {
  loaded: false,
  time: 0,
  minTime: 0,
  mode: 'time',
  fetchTiledLocks: {},
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

function wxLinearInterpolate(factor, startData, endData, result) {
  result[0] = linearInterpolate(factor, startData[0], endData[0]);
  result[1] = linearInterpolate(factor, startData[1], endData[1]);
}

function wxTimeInterpolate(factor, startData, endData, result) {
  const fEnd = -2 * Math.pow(factor, 3) + 3 * Math.pow(factor, 2)
  const fStart = 1 - fEnd;

  result[0] = fStart * startData[0] + fEnd * endData[0];
  result[1] = fStart * startData[1] + fEnd * endData[1];
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
        tiled: layerInfo.tiled,
        tileSize: layerInfo.tileSize,
        tiles: layerInfo.tiles,
        cellSize: layerInfo.cellSize,
        cells: layerInfo.cells,
        cachedTimeIdx: 0,
        windMap: [],
      }

      for (let x = 0; x < layerInfo.tiles[1]; x++) {
        weatherLayer.windMap.push([]);
        for (let y = 0; y < layerInfo.tiles[0]; y++) {
          weatherLayer.windMap[x].push(null);
        }
      }
      weatherLayer.tileCells = [layerInfo.tileSize[0] / layerInfo.cellSize[0],
                                layerInfo.tileSize[1] / layerInfo.cellSize[1]];

      weatherData[weatherData.length] = weatherLayer;
    },
    setTimeSeries(state, layerInfo) {
      const weatherLayer = layerInfo.layer;
      weatherLayer.timeSeries = layerInfo.timeSeries;
    },
    updateTile(state, weatherTile) {
      let weatherLayer = weatherTile.layer;
      weatherLayer.windMap[weatherTile.x][weatherTile.y] = weatherTile.windMap;
    },
    update(state, weatherLayer) {
      state.dataStamp++;

      weatherData = weatherData.filter((layer) => layer.name !== weatherLayer.name);
      weatherData.unshift(weatherLayer);

      state.firstTimestamp = weatherLayer.timeSeries[0];
      state.lastTimestamp = weatherLayer.timeSeries[weatherLayer.timeSeries.length - 1];
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
    lockTiled(state, dataUrl) {
      Vue.set(state.fetchTiledLocks, dataUrl, true);
    },
    unlockTiled(state, dataUrl) {
      Vue.delete(state.fetchTiledLocks, dataUrl);
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

    latLngWind: (state) => (latLng, timestamp = null) => {
      if (!state.dataStamp) {
        return null;
      }

      return latLngWind(latLng, timestamp)
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
    async updateSafe ({dispatch, commit, rootGetters}, dataUrl) {
      const firstWeather = (state.dataStamp === 0);
      const weatherLayer = findWeatherLayer(dataUrl);

      if (weatherLayer !== null) {
        commit('update', weatherLayer);
        const now = rootGetters['time/now']();
        commit('updateFetchTime', now);
        if (!firstWeather) {
          const d = new Date(weatherLayer.updated);
          dispatch('notifications/add', {
            text: 'Weather updated at ' + msecToUTCHourMinString(d),
          }, {root: true});
        }
      }
    },

    // ADDME: when to fetch the next wx, add the support in a concurrency
    // safe way to avoid multiple overlapping weather fetches.
    async fetchInfo ({rootState, rootGetters, dispatch, commit}) {
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

      try {
        let weatherInfo = await dispatch('solapi/get', getDef, {root: true});
        let dataUrl = weatherInfo.url;
        if (findWeatherLayer(dataUrl) !== null) {
          commit('solapi/unlock', 'weather', {root: true});
          commit('updateFetchTime', rootGetters['time/now']());
          return;
        }

        if (typeof weatherInfo.layers !== 'undefined') {
          if (typeof weatherInfo.layers.layer === 'undefined') {
            commit('solapi/unlock', 'weather', {root: true});
            dispatch('diagnostics/add', 'WX ERROR: Invalid layer definition!',
                     {root: true});
            return;
          }

          let layerInfo;
          if (!Array.isArray(weatherInfo.layers.layer)) {
            layerInfo = weatherInfo.layers.layer;
          } else {
            layerInfo = weatherInfo.layers.layer[0];
          }
          dataUrl = await dispatch('layerParser',
                                   {dataUrl: dataUrl, info: layerInfo});
          commit('solapi/unlock', 'weather', {root: true});
          if (dataUrl === null) {
            return;
          }
          dispatch('fetchTiledWeather', dataUrl);

        } else {
          await dispatch('fetchTile', {dataUrl: dataUrl, tiled: false});
          dispatch('updateSafe', dataUrl);
        }

      } catch(err) {
        commit('solapi/unlock', 'weather', {root: true});
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
      }
    },

    async layerParser ({dispatch, commit}, layer) {
      let dataUrl = layer.dataUrl;
      const layerInfo = layer.info

      let origo = [parseFloat(layerInfo.lat_min),
                   parseFloat(layerInfo.lon_min)];
      const lat_max = parseFloat(layerInfo.lat_max);
      const lon_max = parseFloat(layerInfo.lon_max);

      let boundary = L.latLngBounds(L.latLng(origo[0], origo[1]),
                                    L.latLng(lat_max, lon_max));
      let cellSize = [parseFloat(layerInfo.lat_increment),
                      parseFloat(layerInfo.lon_increment)];
      let cells = [Math.round((lat_max - origo[0]) / cellSize[0]),
                   Math.round((lon_max - origo[1]) / cellSize[1])];
      let tiled = false;

      let tileSize = [cells[0] * cellSize[0], cells[1] * cellSize[1]];
      let tiles = [1, 1];
      if ((typeof layerInfo.lat_tile_increment !== 'undefined') &&
          (typeof layerInfo.lon_tile_increment !== 'undefined')) {
        tileSize = [parseFloat(layerInfo.lat_tile_increment),
                    parseFloat(layerInfo.lon_tile_increment)];
        /* Pure ceil not safe here due to float precision (=x+epsilon) => x+1 */
        tiles = [Math.ceil((lat_max - origo[0]) / tileSize[0] - 0.000001),
                 Math.ceil((lon_max - origo[1]) / tileSize[1] - 0.000001)];
        tiled = true;
        dataUrl = layerInfo.url;
      }

      const updated = UTCToMsec(layerInfo.last_updated);
      if (updated === null) {
        dispatch(
          'diagnostics/add',
          'DATA ERROR: Invalid date in weather data: ' + layerInfo.last_updated,
          {root: true}
        );
        return null;
      }

      /* Improve performance by freezing all interpolation related
       * array objects. This avoid adding unnecessary reactivity detectors.
       */
      origo = Object.freeze(origo);
      tileSize = Object.freeze(tileSize);
      cellSize = Object.freeze(cellSize);
      cells = Object.freeze(cells);
      boundary = Object.freeze(boundary);

      let weatherLayerInfo = {
        name: 'dummy',
        updated: updated,
        url: dataUrl,
        boundary: boundary,
        origo: origo,
        tiled: tiled,
        tileSize: tileSize,
        tiles: tiles,
        cellSize: cellSize,
        cells: cells,
      };
      commit('setupLayer', weatherLayerInfo);

      return dataUrl;
    },

    async fetchTiledWeather({state, dispatch, rootGetters, commit}, dataUrl) {
      if (typeof state.fetchTiledLocks[dataUrl] !== 'undefined') {
        return;
      }
      try {
        commit('lockTiled', dataUrl);
        // FIXME: backoff on errors
        // ADDME: load more than one wx tile in parallel
        // ADDME: sort tiles based on closeness
        // ADDME: limit loading to distance
        let weatherLayer = findWeatherLayer(dataUrl);
        const bounds = rootGetters['race/raceBounds'];
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        let lonTiles = L.point(sw.lng - weatherLayer.origo[1],
                               ne.lng - weatherLayer.origo[1])
                          .divideBy(weatherLayer.tileSize[1])
                          .floor();
        let latTiles = L.point(sw.lat - weatherLayer.origo[0],
                               ne.lat - weatherLayer.origo[0])
                          .divideBy(weatherLayer.tileSize[0])
                          .floor();

        const maxLonTile = Math.floor(360 / weatherLayer.tileSize[1]);
        let pending = [];
        for (let y = latTiles.x; y <= latTiles.y; y++) {
          for (let x = lonTiles.x; x <= lonTiles.y; x++) {
            let tileX = x;
            if (tileX >= maxLonTile) {
              tileX %= maxLonTile;
            }
            if (tileX <= weatherLayer.tiles[1]) {
              pending.push({x: tileX, y: y});
            }
          }
        }

        while (pending.length > 0) {
          let tileCoords = pending.shift();
          let res = await dispatch('fetchTile', {dataUrl: dataUrl, tiled: true,
                                                 x: tileCoords.x,
                                                 y: tileCoords.y});

          if (!res) {
            pending.push(tileCoords);
            dispatch(
              'diagnostics/add',
              'WX ERROR: wx tile ' + tileCoords.x + ',' + tileCoords.y +
              ' load failed!',
              {root: true}
            );
          }

          /* Weather layer still exists? */
          if (findWeatherLayer(dataUrl) === null) {
            const d = new Date(weatherLayer.updated);
            dispatch(
              'diagnostics/add',
              'WX ERROR: wx update ' + msecToUTCHourMinString(d) +
              ' superceded, aborting tile download!',
              {root: true}
            );
            return;
          }
        }

        dispatch('updateSafe', dataUrl);
      } catch(err) {
        dispatch('diagnostics/add', 'wx: tiled fetch failed!');
        // ADDME: log errors to weatherdata, refactor solapi stat init first
      } finally {
        commit('unlockTiled', dataUrl);
      }
    },

    async fetchTile ({commit, dispatch}, tileDef) {
      let tileUrl = tileDef.dataUrl;
      let x = 0;
      let y = 0;

      if (tileDef.tiled) {
        tileUrl = tileUrl.replace('{x}', tileDef.x).replace('{y}', tileDef.y);
        x = tileDef.x;
        y = tileDef.y;
      }

      let getDef = {
        apiCall: 'weatherdata',
      };
      try {
        getDef = {
          apiCall: 'weatherdata',
          url: tileUrl,
          params: {},
          useArrays: false,
          dataField: 'weathersystem',
        };

        let weatherData = await dispatch('solapi/get', getDef, {root: true});

        let weatherLayer = findWeatherLayer(tileDef.dataUrl);
        if (weatherLayer === null && !tileDef.tiled) {
          const dataUrl = await dispatch('layerParser',
                                         {dataUrl: tileDef.dataUrl,
                                          info: weatherData.$});
          if (dataUrl === null) {
            return false;
          }
        }

        weatherLayer = findWeatherLayer(tileDef.dataUrl);
        if (weatherLayer === null) {
          dispatch(
            'diagnostics/add',
            'WX SETUP ERROR: no weather layer for ' + tileDef.dataUrl,
            {root: true}
          );
          return false;
        }

        for (let frame of weatherData.frames.frame) {
          frame.utc = UTCToMsec(frame.$.target_time);
          if (frame.utc === null) {
            dispatch(
              'diagnostics/add',
              'DATA ERROR: Invalid date in weather data: ' + frame.$.target_time,
              {root: true}
            );
            return false;
          }
        }
        weatherData.frames.frame.sort((a, b) => { return a.utc - b.utc; });
        let timeSeries = weatherData.frames.frame.map(frame => frame.utc);
        timeSeries = Object.freeze(timeSeries);
        if (weatherLayer.timeSeries === null) {
          commit('setTimeSeries', {layer: weatherLayer, timeSeries: timeSeries});
        }

        if (timeSeries.length !== weatherLayer.timeSeries.length) {
          dispatch(
            'diagnostics/add',
            'DATA ERROR: Incompatible frame timestamp count: ' +
            timeSeries.length + ', expected ' + weatherLayer.timeSeries.length,
            {root: true}
          );
          return;
        }
        for (let i = 0; i < timeSeries.length; i++) {
          if (timeSeries[i] !== weatherLayer.timeSeries[i]) {
            dispatch(
              'diagnostics/add',
              'DATA ERROR: Incompatible frame date in weather tile: ' +
              timeSeries[i] + ', expected ' + weatherLayer.timeSeries[i],
              {root: true}
            );
            return false;
          }
        }

        let cells = weatherLayer.cells;
        if (tileDef.tiled) {
          cells = weatherLayer.tileCells;
        }
        let windMap = [];
        /* FIXME: It takes quite long time to parse&mangle the arrays here,
         * perhaps use vue-worker for this but then also xml2js parsing will
         * consume lots of time. My initial attempt failed on lacking
         * this.$worker for solapi side so the JS syntax needs to solved
         * for this conversion to take place.
         */
        for (let frame of weatherData.frames.frame) {
          let u = frame.U.trim().split(/;\s*/);
          let v = frame.V.trim().split(/;\s*/);
          if ((u.length !== cells[1] + 2) ||
              (u.length !== v.length)) {
            dispatch(
              'diagnostics/add',
              'DATA ERROR: Inconsistent weather lengths: ' +
              (cells[1] + 2) + ' ' + u.length + ' ' + v.length,
              {root: true}
            );
            return false;
          }

          let windFrame = [];
          for (let i = 0; i < u.length-1; i++) {
            if (u[i] === '') {
              break;
            }

            let uu = u[i].trim().split(/\s+/);
            let vv = v[i].trim().split(/\s+/);

            if ((uu.length !== cells[0] + 2) &&
                (uu.length !== vv.length)) {
              dispatch(
                'diagnostics/add',
                'DATA ERROR: Inconsistent weather lengths: ' +
                (cells[0] + 2) + ' ' + uu.length + ' ' + vv.length,
                {root: true}
              );
              return false;
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

        const weatherTile = {
          layer: weatherLayer,
          x: x,
          y: y,
          windMap: windMap,
        };
        commit('updateTile', weatherTile);
      } catch(err) {
        commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
        return false;
      } finally {
        if (!tileDef.tiled) {
          commit('solapi/unlock', 'weather', {root: true});
        }
      }
      return true;
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
