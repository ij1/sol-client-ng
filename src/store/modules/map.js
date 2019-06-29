import L from 'leaflet';
import { configSetValue } from '../../components/config/configstore.js';

export default {
  namespaced: true,

  state: {
    center: L.latLng(0, 0),
    zoom: 3,
    bounds: L.latLngBounds([-1, -1], [1, 1]),      /* dummy initial value */
    wrapList: [-360, 0, 360],
    minZoom: 1,
    maxZoom: 18,
    hoverLatLng: null,
    size: L.point(1, 1),
    viewUpdateStamp: 0,

    cfg: {
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
  },
}
