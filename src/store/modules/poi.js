export default {
  namespaced: true,

  state: {
    pois: [],
    poiId: 0,
  },

  mutations: {
    newPoi (state, poi) {
      poi.id = state.poiId;
      poi.showButterfly = false;
      state.poiId++;

      state.pois.push(poi);
    },
    delPoi (state, id) {
      state.pois = state.pois.filter(i => i.id !== id);
    },
    toggleButterfly (state, id) {
      for (let poi of state.pois) {
        if (poi.id === id) {
          poi.showButterfly = !poi.showButterfly;
          return;
        }
      }
    },
  },
}
