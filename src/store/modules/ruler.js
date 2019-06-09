export default {
  namespaced: true,

  state: {
    enabled: false,
    lastPosition: null,
    rulerSegments: [],
    segmentId: 0,
  },

  mutations: {
    on (state) {
      state.enabled = true;
    },
    off (state) {
      state.enabled = false;
      state.lastPosition = null;
    },
    newPath (state, latLng) {
      state.lastPosition = latLng;
    },
    extendPath (state, segment) {
      segment.id = state.segmentId;
      state.segmentId++;

      state.rulerSegments.push(segment);
      state.lastPosition = segment.line[1];
    },
  },
}
