import L from 'leaflet';
import { configSetValue } from '../../components/config/configstore.js';
import { OLD_CLIENT_MAXZOOM } from '../../lib/sol.js';
import { boatScaleDivisor } from '../../lib/boatshape.js';

function updateWrapList (state) {
  const mapMinWrap = Math.floor((state.bounds.getWest() + 180) / 360) * 360;
  const mapMaxWrap = Math.ceil((state.bounds.getEast() - 180) / 360) * 360;

  /* Only update when needed to avoid unnecessary work */
  if ((state.wrapList[0] !== mapMinWrap - 360) ||
      (state.wrapList[state.wrapList.length - 1] !== mapMaxWrap + 360)) {
    let wrapList = [];
    for (let i = mapMinWrap - 360; i <= mapMaxWrap + 360; i += 360) {
      wrapList.push(i);
    }
    state.wrapList = wrapList;

    return true;
  }
  return false;
}

export default {
  namespaced: true,

  state: {
    map: null,
    center: L.latLng(0, 0),
    zoom: 3,
    bounds: L.latLngBounds([-1, -1], [1, 1]),      /* dummy initial value */
    tripleBounds: L.latLngBounds([-1, -1], [1, 1]),/* dummy initial value */
    wrapList: [-360, 0, 360],
    hoverLatLng: null,
    size: L.point(1, 1),
    zoomStep: 0.1,
    viewUpdateStamp: 0,

    cfg: {
      courseDrawMode: {
        value: 'default',
        type: 'values',
        values: [
          ['default', 'Draw entire course'],
          ['oldfade', 'De-emphasize old legs'],
          ['fade', 'De-emphasize distant legs'],
        ],
        cfgText: 'Race course draw mode',
      },
      highlightLeader: {
        value: true,
        type: 'boolean',
        cfgText: 'Highlight race leader'
      },
      fleetBoatMode: {
        value: 'select',
        type: 'values',
        values: [
          ['off', 'Always invisible'],
          ['select', 'Visible when selected'],
          ['on', 'Always visible'],
        ],
        cfgText: 'Visibility of own fleet boat'
      },
      ownBoatColor: {
        value: 'magenta',
        type: 'values',
        values: [
          ['magenta', 'magenta'],
          ['server', 'use server color'],
        ],
        cfgText: 'Color for own trace and fleet boat',
      },
      commandBoatColor: {
        value: '#FF00FF',
        type: 'color',
        cfgText: 'Command boat and predictor color',
      },
      boatScale: {
        value: boatScaleDivisor,	/* divided by boatScaleDivisor */
        type: 'range',
        low: 3,
        high: 7,
        lowText: 'small',
        highText: 'large',
        cfgText: 'Boat scale',
      },
      boatKeys: {
        value: 'corner',
        type: 'values',
        values: [
          ['corner', 'in corner'],
          ['map', 'on map'],
          ['both', 'both corner and map'],
        ],
        cfgText: 'Boat keys',
      },
      tinyIslands: {
        value: 'default',
        type: 'values',
        values: [
          ['default', 'default, no minimum size'],
          ['1px', '1 pixel'],
          ['3px', '2-3 pixels'],
        ],
        cfgText: 'Minimum size for drawing tiny islands',
      },
      extraZoomLevels: {
        value: false,
        type: 'boolean',
        cfgText: 'Allow extra zoom (Warning: incompatible with PR rules)',
      }
    },
  },

  mutations: {
    setMap(state, map) {
      state.map = map;
    },
    setView(state, view) {
      let updated = false;

      if (state.center.lat !== view.center.lat ||
          state.center.lng !== view.center.lng) {
        state.center = view.center;
        updated = true;
      }

      if (state.zoom !== view.zoom) {
        state.zoom = view.zoom;
        updated = true;
      }

      if (state.bounds.getWest() !== view.bounds.getWest() ||
          state.bounds.getEast() !== view.bounds.getEast() ||
          state.bounds.getNorth() !== view.bounds.getNorth() ||
          state.bounds.getSouth() !== view.bounds.getSouth()) {
        state.bounds = view.bounds;
        state.tripleBounds = view.tripleBounds;
        updated = true;
      } else if (state.tripleBounds.getWest() !== view.tripleBounds.getWest() ||
                 state.tripleBounds.getEast() !== view.tripleBounds.getEast() ||
                 state.tripleBounds.getNorth() !== view.tripleBounds.getNorth() ||
                state.tripleBounds.getSouth() !== view.tripleBounds.getSouth()) {
        state.tripleBounds = view.tripleBounds;
        updated = true;
      }

      if (typeof view.size !== 'undefined' &&
          (state.size.x !== view.size.x ||
           state.size.y !== view.size.y)) {
        state.size = view.size;
        updated = true;
      }

      if (updateWrapList(state)) {
        updated = true;
      }

      if (updated) {
        state.viewUpdateStamp++;
      }
    },
    setHover(state, latLng) {
      state.hoverLatLng = latLng;
    },
    configSetValue,
  },
  getters: {
    wrappedHoverLatLng: (state) => {
      return (state.hoverLatLng !== null) ? state.hoverLatLng.wrap() : null;
    },
    hoverWind: (state, getters, rootState, rootGetters) => {
      if (state.hoverLatLng === null) {
        return null;
      }
      return rootGetters['weather/latLngWind'](getters.wrappedHoverLatLng);
    },
    maxZoom: (state) => {
      return state.cfg.extraZoomLevels.value ? 21 : OLD_CLIENT_MAXZOOM;
    },
    minZoom: (state) => {
      if (state.map === null) {
        return 0;
      }
      return state.map.getBoundsZoom(L.latLngBounds(L.latLng(-90, -180),
                                                    L.latLng(90, 180)));
    },
    fleetTilesNeedRedraw: (state, getters, rootState, rootGetters) => {
      rootState.race.fleet.searchTreeStamp;
      rootState.weather.data.updated;
      state.zoom;
      state.cfg.fleetBoatMode.value;
      rootGetters['race/fleet/selectedFiltered'];
      state.cfg.ownBoatColor.value;
      state.cfg.boatScale.value;
      if (rootState.ui.boatlists.filterList !== null) {
        rootGetters['ui/boatlists/currentFilter'].filterStamp;
      }

      return Date.now();
    },
  },
}
