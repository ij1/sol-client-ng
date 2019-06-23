import L from 'leaflet';

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
  },
  getters: {
    wrappedHoverLatLng: (state) => {
      return (state.hoverLatLng !== null) ? state.hoverLatLng.wrap() : null;
    },
  },
}
