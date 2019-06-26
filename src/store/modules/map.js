import L from 'leaflet';
import { configSetValue } from '../../components/config/configstore.js';

export default {
  namespaced: true,

  state: {
    center: L.latLng(0, 0),
    zoom: 3,
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
    setHover(state, latLng) {
      state.hoverLatLng = latLng;
    },
    configSetValue,
  },
  getters: {
    wrappedHoverLatLng: (state) => {
      return (state.hoverLatLng !== null) ? state.hoverLatLng.wrap() : null;
    },
  },
}
