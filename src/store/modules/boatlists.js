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
    add (state, boatlist) {
      Vue.set(state.boatlists, state.boatlists.length, {
        name: boatlist.name,
        boatlistKey: state.boatlistKey,
        filter: {
          boats: boatlist.filter.boats,
          distance: boatlist.filter.distance,
        },
        deletable: true,
        showOblyListBoats: false,
      });
      state.activeList = state.boatlistKey;

      state.boatlistKey++;
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
  },
}
