export default {
  namespaced: true,

  state: {
    pois: [],
    poiId: 0,
  },

  mutations: {
    newPoi (state, poi) {
      poi.id = state.poiId;
      state.poiId++;

      state.pois.push(poi);
    },
    delPoi (state, id) {
      state.pois = state.pois.filter(i => i.id !== id);
    },
  },
}
