import Vue from 'vue';
import L from 'leaflet';

function tileIdToKey(id) {
  return id.l + ':' + id.x + ':' + id.y;
}

export default {
  namespaced: true,

  state: {
    tiles: {},
    urlBase: '/site_media/maps/tiles/',
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
      const key = tileIdToKey(id);
      if (typeof state.tiles[key] !== 'undefined') {
        return;
      }

      Vue.set(state.tiles, key, {
        id: id,
        loading: false,
        loaded: false,
        refcount: 0,
        geoms: {},
      });
    },

    storeTileGeoms (state, tileInfo) {
      state.tiles[tileInfo.key].geoms = tileInfo.geoms;
      state.tiles[tileInfo.key].loaded = true;
      state.tiles[tileInfo.key].loading = false;
    },

    setLoading (state, key) {
      state.tiles[key].loading = true;
    }
  },

  actions: {
    loadTile ({state, getters, commit, dispatch}, id) {
      const key = getters.tileIdToKey(id);
      if (state.tiles[key].loading || state.tiles[key].loaded) {
        return;
      }

      const getDef = {
        url: getters.tileIdToUrl(id),
        params: {},
        useArrays: true,
        dataField: 'data',
        compressedPayload: true,

        dataHandler: (data) => {
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
        }
      };
      commit('setLoading', key);
      dispatch('solapi/get', getDef, {root: true});
    },

    //
    // ADDME: pruning tiles to save some memory
    //
  },
}
