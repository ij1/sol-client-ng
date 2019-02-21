import L from 'leaflet';

export default {
  namespaced: true,

  state: {
    center: L.latLng(0, 0),
    zoom: 3,
    hoverLatLng: null,
    size: L.Point(1, 1),
  },

  mutations: {
    setView(state, view) {
      state.center = view.center;
      state.zoom = view.zoom;
      state.bounds = view.bounds;
    },
    setSize(state, size) {
      state.size = size.size;
      state.bounds = size.bounds;
    },
    setHover(state, latLng) {
      state.hoverLatLng = latLng;
    },
  },
}
