import Vue from 'vue';

function __addOrEdit (state, boatlist) {
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
      filterStamp: state.nextFilterStamp++,
    },
    editable: true,
    showOblyListBoats: false,
  });

  return key;
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
    localStorageComponents: [
      'boats:',
      'distance:',
      'country:',
    ],
  },

  mutations: {
    init (state) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        let listName;
        if (key.startsWith(state.localStoragePrefix)) {
          for (let comp of state.localStorageComponents) {
            if (key.startsWith(state.localStoragePrefix + comp)) {
              /* Found an useful key */
              listName = key.substring(state.localStoragePrefix.length +
                                       comp.length);
              break;
            }
          }
          if (listName.length === 0) {
            continue;
          }

          const boatsKey = state.localStoragePrefix + 'boats:' + listName;
          const distanceKey = state.localStoragePrefix + 'distance:' + listName;
          const countryKey = state.localStoragePrefix + 'country:' + listName;
          let listBoats = localStorage.getItem(boatsKey);
          let distance = localStorage.getItem(distanceKey);
          let listCountry = localStorage.getItem(countryKey);

          if (listBoats !== null) {
            listBoats = listBoats.split(/;/);
            if (listBoats.length === 0) {
              listBoats = null;
            }
          }
          if (distance !== null) {
            distance = parseFloat(distance);
            if (isNaN(distance)) {
              distance = null;
            }
          }

          if (listCountry !== null) {
            listCountry = listCountry.split(/;/);
            if (listCountry.length === 0) {
              listCountry = null;
            }
          }

          if ((listBoats !== null) ||
              (distance !== null) ||
              (listCountry !== null)) {

            __addOrEdit(state, {
              editListKey: null,
              name: listName,
              filter: {
                boats: listBoats !== null ? new Set(listBoats) : null,
                distance: distance,
                country: listCountry !== null ? new Set(listCountry) : null,
              }
            });
          }
        }
      }
    },
    addOrEdit (state, boatlist) {
      const key = __addOrEdit(state, boatlist);
      state.activeList = key;

      const boatsKey = state.localStoragePrefix + 'boats:' + boatlist.name;
      const distanceKey = state.localStoragePrefix + 'distance:' + boatlist.name;
      const countryKey = state.localStoragePrefix + 'country:' + boatlist.name;
      if (boatlist.filter.boats !== null) {
        localStorage.setItem(boatsKey, [...boatlist.filter.boats].join(';'));
      }
      if (boatlist.filter.distance !== null) {
        localStorage.setItem(distanceKey, boatlist.filter.distance);
      }
      if (boatlist.filter.country !== null) {
        localStorage.setItem(countryKey, [...boatlist.filter.country].join(';'));
      }
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
