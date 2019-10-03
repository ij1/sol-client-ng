import L from 'leaflet';

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
        if (state.rulerPendingPosition.wrap().equals(lastFixedSegment.line[1].wrap())) {
          const adjust = state.rulerPendingPosition.lng - lastFixedSegment.line[1].lng;
          let newPos = lastFixedSegment.line[0];
          if (adjust !== 0) {
            newPos = L.latLng(newPos.lat, newPos.lng + adjust);
          }
          state.rulerPendingPosition = newPos;
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
  getters: {
    wrappedPendingPosition: (state) => {
      return state.rulerPendingPosition === null ? null :
             state.rulerPendingPosition.wrap();
    },
    lastSegment: (state) => {
      return state.rulerSegments.length === 0 ? null :
             state.rulerSegments[state.rulerSegments.length - 1];
    },
    extendingPath: (state, getters) => {
      if ((state.rulerPendingPosition === null) ||
          (getters.lastSegment === null)) {
        return false;
      }

      const lastSegmentEndPoint = getters.lastSegment.wrappedLine[getters.lastSegment.wrappedLine.length - 1];
      return getters.wrappedPendingPosition.equals(lastSegmentEndPoint);
    },
  },
}
