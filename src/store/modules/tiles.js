import Vue from 'vue';
import L from 'leaflet';
import { secToMsec } from '../../lib/utils.js';
import { solapiRetryDispatch } from '../../lib/solapi.js';
import { lowPrioTask } from '../../lib/lowprio.js';

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
    maxParallelFetches: 8,
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
    deleteTile (state, key) {
      Vue.delete(state.tiles, key);
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
          dispatch('loadTiles', 0);
        }
      }
    },
    loadTiles ({state, commit, dispatch}, failTimer) {
      let key;
      do {
        key = state.waitList[0];
        commit('consumeTileToLoad');
        if (typeof key !== 'undefined') {
          /* Outside of visible area already? */
          if (state.tiles[key].refCount === 0) {
            commit('deleteTile', key);
            continue;
          }
          dispatch('loadTile', {
            key: key,
            failTimer: failTimer,
          });
          return;
        }
      } while (typeof key !== 'undefined');
    },
    loadTile ({state, getters, commit, dispatch}, loadInfo) {
      const key = loadInfo.key;
      if (state.tiles[key].loaded) {
        return;
      }

      let failTimer = 0;

      commit('addActiveFetches', 1);
      const getDef = {
        url: getters.tileIdToUrl(state.tiles[key].id),
        params: {},
        useArrays: true,
        dataField: 'data',
        compressedPayload: true,
      };

      dispatch('solapi/get', getDef, {root: true})
      .then(async (data) => {
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
        await lowPrioTask.idle();
      })
      .catch(err => {
        commit('solapi/logError', {
          apiCall: 'tiles',
          error: err,
        }, {root: true});
        commit('addTileToLoadWaitList', key);   /* Requeue */
        /* Backoff to up to 60 seconds */
        failTimer = Math.min((loadInfo.failTimer + 100) * 2, secToMsec(60));
        /* 50% - 100% of time timer to avoid synchronization bursts */
        failTimer = Math.random() * failTimer / 2 + failTimer / 2;
      })
      .finally(() => {
        commit('addActiveFetches', -1);
        solapiRetryDispatch(dispatch, 'loadTiles', failTimer, failTimer);
      });
    },

    //
    // ADDME: pruning tiles to save some memory
    //
  },
}
