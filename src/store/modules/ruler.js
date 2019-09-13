export default {
  namespaced: true,

  state: {
    enabled: false,
    rulerSegments: [],
    rulerPendingPosition: null,
    segmentId: 0,
  },

  mutations: {
    on (state) {
      state.enabled = true;
    },
    off (state) {
      state.enabled = false;
    },
    newSegment (state, segment) {
      segment.id = state.segmentId;
      state.segmentId++;

      state.rulerSegments.push(segment);
    },
    delSegment (state) {
      state.rulerSegments.pop();
    },
    delAll (state) {
      state.rulerSegments = [];
      state.rulerPendingPosition = null;
    },
    setPendingPosition (state, pendingPosition) {
      state.rulerPendingPosition = pendingPosition;
    },
  },
}
