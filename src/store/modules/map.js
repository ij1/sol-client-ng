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
  }
}

export default {
  namespaced: true,

  state: {
    center: L.latLng(0, 0),
    zoom: 3,
    bounds: L.latLngBounds([-1, -1], [1, 1]),      /* dummy initial value */
    tripleBounds: L.latLngBounds([-1, -1], [1, 1]),/* dummy initial value */
    wrapList: [-360, 0, 360],
    minZoom: 1,
    hoverLatLng: null,
    size: L.point(1, 1),
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
      boatScale: {
        value: boatScaleDivisor,	/* divided by boatScaleDivisor */
        type: 'range',
        low: 3,
        high: 7,
        lowText: 'small',
        highText: 'large',
        cfgText: 'Boat scale',
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
    setView(state, view) {
      state.center = view.center;
      state.zoom = view.zoom;
      state.bounds = view.bounds;
      state.tripleBounds = view.tripleBounds;
      if (typeof view.size !== 'undefined') {
        state.size = view.size;
      }
      updateWrapList(state);
      state.viewUpdateStamp++;
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
