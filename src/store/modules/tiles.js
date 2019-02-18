import Vue from 'vue';
import L from 'leaflet';
import { SkipThenError, solapiLogError } from '../../lib/solapi.js';

function tileIdToKey(id) {
  return id.l + ':' + id.x + ':' + id.y;
}

export default {
  namespaced: true,

  state: {
    tiles: {},
    urlBase: '/site_media/maps/tiles/',
    waitList: [],
    activeFetches: 0,
    maxParallelFetches: 4,
  },

  getters: {
    tileIdToUrl: (state) => (id) => {
      return state.urlBase + id.l + '/' + id.x + '_' + id.y + '.xml.z';
    },
    tileIdToKey: () => (id) => {
      return tileIdToKey(id);
    },
    tileGridSize: () => (tileset) => {
      const degrees = {c: 45, l: 10, i: 2, h: 1};
      return degrees[tileset];
    },
  },

  mutations: {
    addTile (state, id) {
      Vue.set(state.tiles, tileIdToKey(id), {
        id: id,
        loaded: false,
        refCount: 1,
        geoms: {},
      });
    },
    lockTile (state, id) {
      state.tiles[tileIdToKey(id)].refCount++;
    },
    unlockTile (state, id) {
      state.tiles[tileIdToKey(id)].refCount--;
    },

    storeTileGeoms (state, tileInfo) {
      state.tiles[tileInfo.key].geoms = tileInfo.geoms;
      state.tiles[tileInfo.key].loaded = true;
    },

    addActiveFetches (state, inc) {
      state.activeFetches += inc;
    },
    addTileToLoadWaitList (state, key) {
      state.waitList.push(key);
    },
    /*
     * Vuex workaround: unfortunately cannot return the value from here
     * so get it in action instead :-(
     */
    consumeTileToLoad (state) {
      state.waitList.shift();
    },
  },

  actions: {
    addTile ({state, getters, commit, dispatch}, id) {
      const key = getters.tileIdToKey(id);
      if (typeof state.tiles[key] !== 'undefined') {
        commit('lockTile', id);
      } else {
        commit('addTile', id);
        commit('addTileToLoadWaitList', key);
        if (state.activeFetches < state.maxParallelFetches) {
          dispatch('loadTiles');
        }
      }
    },
    loadTiles ({state, commit, dispatch}) {
      const key = state.waitList[0];
      commit('consumeTileToLoad');
      if (typeof key !== 'undefined') {
        dispatch('loadTile', key);
      }
    },
    loadTile ({state, getters, commit, dispatch}, key) {
      if (state.tiles[key].loaded) {
        return;
      }

      commit('addActiveFetches', 1);
      const getDef = {
        url: getters.tileIdToUrl(state.tiles[key].id),
        params: {},
        useArrays: true,
        dataField: 'data',
        compressedPayload: true,
      };

      dispatch('solapi/get', getDef, {root: true})
      .catch(err => {
        solapiLogError(err);
        throw new SkipThenError();
      })
      .then(data => {
        let geoms = {};

        if (typeof data.cell[0].poly !== 'undefined') {
          for (let poly of data.cell[0].poly) {
            let geom = [];
            for (let pt of poly.point) {
              geom.push(Object.freeze(L.latLng(pt.$.lat, pt.$.lon)));
            }

            const level = 'l' + poly.$.level;
            if (typeof geoms[level] === 'undefined') {
              geoms[level] = [];
            }
            geoms[level].push(Object.freeze(geom));
          }
        }

        Object.freeze(geoms);
        commit('storeTileGeoms', {
          key: key,
          geoms: geoms,
        });
      })
      .catch(err => {
        commit('addTileToLoadWaitList', key);   /* Requeue */
        solapiLogError(err);
      })
      .finally(() => {
        commit('addActiveFetches', -1);
        dispatch('loadTiles');
      });
    },

    //
    // ADDME: pruning tiles to save some memory
    //
  },
}
