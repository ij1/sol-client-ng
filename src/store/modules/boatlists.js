import Vue from 'vue';

export default {
  namespaced: true,

  state: {
    boatlists: {
      '-1': {
        name: 'Main Fleet',
        boatlistKey: -1,
        filter: {
          boats: null,
          distance: null,
        },
        editable: false,
        showOnlyListBoats: null,
      },
    },
    defaultList: '-1',
    activeList: '-1',
    nextBoatlistKey: 0,       /* Used to produce unique keys for the lists */
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
        boatlistKey: key,
        filter: {
          boats: boatlist.filter.boats,
          distance: boatlist.filter.distance,
        },
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
