export default {
  namespaced: true,

  state: {
    pois: [],
    poiId: 0,
    targetId: -1,
  },

  mutations: {
    newPoi (state, poi) {
      poi.id = state.poiId;
      poi.showButterfly = false;
      poi.open = true;
      state.poiId++;

      state.pois.push(poi);
    },
    delPoi (state, id) {
      if (state.targetId === id) {
        state.targetId = -1;
      }
      state.pois = state.pois.filter(i => i.id !== id);
    },
    setOpen (state, data) {
      for (let poi of state.pois) {
        if (poi.id === data.id) {
          poi.open = data.open;
          return;
        }
      }
    },
    toggleButterfly (state, id) {
      for (let poi of state.pois) {
        if (poi.id === id) {
          poi.showButterfly = !poi.showButterfly;
          return;
        }
      }
    },
    setTarget (state, id) {
      if (id === null) {
        state.targetId = -1;
      } else {
        state.targetId = id;
      }
    }
  },
  getters: {
    target: (state) => {
      if (state.targetId === -1) {
        return null;
      } else {
        for (let poi of state.pois) {
          if (poi.id === state.targetId) {
            return poi;
          }
        }
      }
    },
  },
}
