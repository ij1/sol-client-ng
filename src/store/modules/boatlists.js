import Vue from 'vue';

export default {
  namespaced: true,

  state: {
    boatlists: {
      '-1': {
        name: 'Main Fleet',
        filter: {
          boats: null,
          distance: null,
          country: null,
        },
        filterStamp: 0,
        editable: false,
      },
    },
    defaultList: '-1',
    activeList: '-1',
    filterList: null,
    nextBoatlistKey: 0,       /* Used to produce unique keys for the lists */
    nextFilterStamp: 1,       /* Unique filter stamps generator */
  },

  mutations: {
    addOrEdit (state, boatlist) {
      let key;

      if ((boatlist.editListKey !== null) &&
          (typeof state.boatlists[boatlist.editListKey] !== 'undefined')) {
        key = boatlist.editListKey;
      } else {
        key = '' + state.nextBoatlistKey;
        state.nextBoatlistKey++;
      }

      Vue.set(state.boatlists, key, {
        name: boatlist.name,
        filter: {
          boats: boatlist.filter.boats,
          distance: boatlist.filter.distance,
          country: boatlist.filter.country,
        },
        filterStamp: state.nextFilterStamp++,
        editable: true,
        showOblyListBoats: false,
      });
      state.activeList = key;
    },
    delete (state, boatlistKey) {
      if (state.activeList === boatlistKey) {
        state.activeList = state.defaultList;
      }
      Vue.delete(state.boatlists, boatlistKey);
    },
    setActive (state, boatlistKey) {
      state.activeList = boatlistKey;
    },
    setFilterList (state, boatlistKey) {
      state.filterList = boatlistKey;
    },
  },
  getters: {
    currentFilter: (state) => {
      return state.filterList !== null ?
             state.boatlists[state.filterList].filter : null;
    }
  },
}
