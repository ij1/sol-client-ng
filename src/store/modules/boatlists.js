import Vue from 'vue';

function __addOrEdit (state, boatlist) {
  let key;
  let oldName = null;

  if ((boatlist.editListKey !== null) &&
      (typeof state.boatlists[boatlist.editListKey] !== 'undefined')) {
    key = boatlist.editListKey;
    oldName = state.boatlists[key].name;
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
      filterStamp: state.nextFilterStamp++,
    },
    editable: true,
    showOblyListBoats: false,
  });

  return {
    key: key,
    oldName: oldName,
  };
}

function deleteListFromLocalStorage (state, name) {
  for (let comp of Object.keys(state.localStorageComponents)) {
    const filterKey = state.localStoragePrefix + comp + ':' + name;
    localStorage.removeItem(filterKey);
  }
}

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
          filterStamp: 0,
        },
        editable: false,
      },
    },
    defaultList: '-1',
    activeList: '-1',
    filterList: null,
    nextBoatlistKey: 0,       /* Used to produce unique keys for the lists */
    nextFilterStamp: 1,       /* Unique filter stamps generator */
    localStoragePrefix: 'sol-boatlist:',
    localStorageComponents: {
      boats: {
        decode: function (data) {
          if (data !== null) {
            const res = data.split(/;/);
            if (res.length > 0) {
              return new Set(res);
            }
          }
          return null;
        },
        encode: function (data) {
          if (data !== null) {
            return [...data].join(';');
          }
          return null;
        },
      },
      distance: {
        decode: function (data) {
          if (data !== null) {
            const res = parseFloat(data);
            if (!isNaN(res)) {
              return res;
            }
          }
          return null;
        },
        encode: function (data) {
          return data;
        },
      },
      country: {
        decode: function (data) {
          if (data !== null) {
            const res = data.split(/;/);
            if (res.length > 0) {
              return new Set(res);
            }
          }
          return null;
        },
        encode: function (data) {
          if (data !== null) {
            return [...data].join(';');
          }
          return null;
        },
      },
    },
  },

  mutations: {
    init (state) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        let listName;
        if (key.startsWith(state.localStoragePrefix)) {
          const comps = Object.keys(state.localStorageComponents);
          for (let comp of comps) {
            if (key.startsWith(state.localStoragePrefix + comp + ':')) {
              /* Found an useful key */
              listName = key.substring(state.localStoragePrefix.length +
                                       comp.length + 1);
              break;
            }
          }
          if (listName.length === 0) {
            continue;
          }

          let filter = {};
          let filterOk = false;
          for (let comp of comps) {
            const filterKey = state.localStoragePrefix + comp + ':' + listName;
            const filterData = localStorage.getItem(filterKey);
            filter[comp] = state.localStorageComponents[comp].decode(filterData);
            if (filter[comp] !== null) {
              filterOk = true;
            }
          }

          if (filterOk) {
            __addOrEdit(state, {
              editListKey: null,
              name: listName,
              filter: filter,
            });
          }
        }
      }
    },
    addOrEdit (state, boatlist) {
      const res = __addOrEdit(state, boatlist);
      state.activeList = res.key;

      if (res.oldName !== null) {
        deleteListFromLocalStorage(state, res.oldName);
      }
      for (let comp of Object.keys(state.localStorageComponents)) {
        const filterKey = state.localStoragePrefix + comp + ':' +
                          state.boatlists[res.key].name;
        const filterData = state.localStorageComponents[comp].encode(boatlist.filter[comp]);
        if (filterData !== null) {
          localStorage.setItem(filterKey, filterData);
        }
      }
    },
    delete (state, boatlistKey) {
      if (state.activeList === boatlistKey) {
        state.activeList = state.defaultList;
      }
      if (state.filterList === boatlistKey) {
        state.filterList = null;
      }
      deleteListFromLocalStorage(state, state.boatlists[boatlistKey].name);
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
    },
    applyFilterToBoat: (state, getters) => (boat) => {
      if (getters.currentFilter === null) {
        return true;
      }
      const currentFilter = getters.currentFilter;
      currentFilter.filterStamp;		/* force dependency */
      if (((currentFilter.boats !== null) &&
           !currentFilter.boats.has(boat.name)) ||
          ((currentFilter.distance !== null) &&
           (boat.distance > currentFilter.distance)) ||
          ((currentFilter.country !== null) &&
           !currentFilter.country.has(boat.country))) {
        return false;
      }
      return true;
    },
  },
}
