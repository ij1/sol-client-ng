export default {
  namespaced: true,

  state: {
    pois: [],
    poiId: 0,
  },

  mutations: {
    newPoi (state, poi) {
      poi.id = poi.segmentId;
      state.segmentId++;

      state.pois.push(poi);
    },
    delPoi (state, id) {
      state.pois = state.pois.filter(i => i.id !== id);
    },
  },
}
