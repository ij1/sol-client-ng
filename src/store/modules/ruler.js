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
      state.rulerPendingPosition = null;
    },
    newSegment (state, segment) {
      segment.id = state.segmentId;
      state.segmentId++;

      state.rulerSegments.push(segment);
    },
    delSegment (state) {
      const lastFixedSegment = state.rulerSegments.length > 0 ?
                               state.rulerSegments[state.rulerSegments.length - 1] :
                               null;

      if ((state.rulerPendingPosition !== null) &&
          (lastFixedSegment !== null)) {
        if (state.rulerPendingPosition.equals(lastFixedSegment.line[1])) {
          state.rulerPendingPosition = lastFixedSegment.line[0];
        } else {
          state.rulerPendingPosition = null;
          return;
        }
      } else {
        state.rulerPendingPosition = null;
      }
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
