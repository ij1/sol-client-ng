import Vue from 'vue';

export default {
  namespaced: true,

  state: {
    boatlists: [
      {
        name: 'Main Fleet',
        boatlistKey: -1,
        filter: {
          boats: null,
          distance: null,
        },
        deletable: false,
        showOnlyListBoats: null,
      },
    ],
    defaultList: -1,
    activeList: -1,
    boatlistKey: 0,       /* Used to produce unique keys for the lists */
  },

  mutations: {
    addOrEdit (state, boatlist) {
      let idx = state.boatlists.length;
      let key;

      if (boatlist.editListKey !== null) {
        for (let i = 0; i < state.boatlists.length; i++) {
          if (state.boatlists[i].boatlistKey === boatlist.editListKey) {
            idx = i;
            key = boatlist.editListKey;
            break;
          }
        }
      }
      if (idx === state.boatlists.length) {
        key = state.boatlistKey;
        state.boatlistKey++;
      }
      Vue.set(state.boatlists, idx, {
        name: boatlist.name,
        boatlistKey: key,
        filter: {
          boats: boatlist.filter.boats,
          distance: boatlist.filter.distance,
        },
        deletable: true,
        showOblyListBoats: false,
      });
      state.activeList = key;
    },
    delete (state, boatlistKey) {
      if (state.activeList === boatlistKey) {
        state.activeList = state.defaultList;
      }
      for (let i = 0; i < state.boatlists.length; i++) {
        if (state.boatlists[i].boatlistKey == boatlistKey) {
          state.boatlists.splice(i, 1);
        }          
      }
    },
    setShowOnly (state, showOnly) {
      state.boatlists[showOnly.boatlistKey] = showOnly.showOnly;
    },
    setFilter (state, filterData) {
      state.boatlists.filter = {
        boats: filterData.boats,
        distance: filterData.distance,
      };
    },
    setActive (state, boatlistKey) {
      state.activeList = boatlistKey;
    }
  },
}
