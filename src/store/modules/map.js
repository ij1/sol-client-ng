import L from 'leaflet';
import { configSetValue } from '../../components/config/configstore.js';
import { OLD_CLIENT_MAXZOOM } from '../../lib/sol.js';

export default {
  namespaced: true,

  state: {
    center: L.latLng(0, 0),
    zoom: 3,
    bounds: L.latLngBounds([-1, -1], [1, 1]),      /* dummy initial value */
    wrapList: [-360, 0, 360],
    minZoom: 1,
    hoverLatLng: null,
    size: L.point(1, 1),
    viewUpdateStamp: 0,

    cfg: {
      ownBoatColor: {
        value: 'magenta',
        type: 'values',
        values: [
          ['magenta', 'magenta'],
          ['server', 'use server color'],
        ],
        cfgText: 'Color for own trace and fleet boat',
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
      state.viewUpdateStamp++;
    },
    setSize(state, size) {
      state.size = size.size;
      state.bounds = size.bounds;
      state.viewUpdateStamp++;
    },
    setWrapList(state, wrapList) {
      state.wrapList = wrapList;
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
    mapMinWrap: (state) => {
      state.bounds;
      const minLat = state.bounds.getWest();
      return Math.floor((minLat + 180) / 360) * 360;
    },
    mapMaxWrap: (state) => {
      state.bounds;
      const maxLat = state.bounds.getEast();
      return Math.ceil((maxLat - 180) / 360) * 360;
    },
    maxZoom: (state) => {
      return state.cfg.extraZoomLevels.value ? 21 : OLD_CLIENT_MAXZOOM;
    },
    fleetTilesNeedRedraw: (state, getters, rootState) => {
      rootState.race.fleet.fleetTime;
      rootState.weather.data.updated;
      state.zoom;
      state.cfg.ownBoatColor.value;
      rootState.ui.boatlists.filterList;

      return Date.now();
    },
  },
}
