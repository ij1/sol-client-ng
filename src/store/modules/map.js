import L from 'leaflet';

export default {
  namespaced: true,

  state: {
    center: L.latLng(0, 0),
    zoom: 3,
    hoverLatLng: null,
  },

  mutations: {
    setView(state, view) {
      state.center = view.center;
      state.zoom = view.zoom;
    },
    setHover(state, latLng) {
      state.hoverLatLng = latLng;
    },
  },
}
