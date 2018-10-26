<template>
  <div>
    <map-tile
      v-for = "tile in tileDrawList"
      :key = "tile.key"
      :tileKeyIn = "tile.key"
      :id = "tile.id"
    />
  </div>
</template>

<script>
import L from 'leaflet';
import MapTile from './tile';

export default {
  name: 'MapTiles',
  components: {
    'map-tile': MapTile,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      zoom: 0,
      layer: null,
      container: null,
      latLngBounds: this.map.getBounds(),
      animFrame: null,
    }
  },

  computed: {
    selectTileset() {
      // FIXME: check these zoom levels and tweak if necessary
      if (this.zoom > 8) {
        return 'h';
      } else if (this.zoom > 4) {
        return 'l';
      }
      return 'c';
    },
    // mapgetter?
    tileGridSize() {
      return this.$store.getters['tiles/tileGridSize'](this.selectTileset);
    },

    gridBounds() {
      const sw = this.latLngBounds.getSouthWest();
      const ne = this.latLngBounds.getNorthEast();
      /* This usually returns one extra tile row/column because of ceil
       * but ceil+subtract 1 would return one too little if the NE point
       * matches to a tile boundary
       */
      return L.bounds(L.point((sw.lng + 180) / this.tileGridSize,
                              (sw.lat + 90) / this.tileGridSize).floor(),
                      L.point((ne.lng + 180) / this.tileGridSize,
                              (ne.lat + 90) / this.tileGridSize).ceil());
    },

    tileDrawList() {
      const bounds = this.gridBounds;
      let list = [];

      /* Should probably do better ordering, that is, center first but given
       * our tiles are large and few per screenful, it probably doesn't
       * matter much.
       */
      for (let x = bounds.min.x; x < bounds.max.x; x++) {
        for (let y = bounds.min.y; y < bounds.max.y; y++) {
          let tile = {
            id: {
              l: this.selectTileset,
              x: x,
              y: y,
            },
          };

          if (!this.isValidTile(tile.id)) {
            // FIXME: how to do wraps with canvases? Maybe copy canvases
            // somewhere?
            continue;
          }
          tile.key = this.$store.getters['tiles/tileIdToKey'](tile.id);
          list.push(tile);
          this.$store.commit('tiles/addTile', tile.id);
        }
      }
      return list;
    },
  },

  methods: {
    tileIdToBounds(id) {
      return L.latLngBounds(
        L.latLng(id.y * this.tileGridSize - 90,
                 id.x * this.tileGridSize - 180),
        L.latLng((id.y + 1) * this.tileGridSize - 90,
                 (id.x + 1) * this.tileGridSize - 180)
      );
    },

    /* WARNING: this does not check the l but uses the current one directly
     * but it should be enough for our usecases
     */
    isValidTile (id) {
      if (id.x < 0 || id.y < 0) {
        return false;
      }
      if ((id.x * this.tileGridSize >= 360) ||
          (id.y * this.tileGridSize >= 180)) {
        return false;
      }
      return true;
    },
    setBounds() {
      this.latLngBounds = this.map.getBounds();
      this.animFrame = null;
    },

    updateZoom() {
      if (this.zoom != this.map.getZoom()) {
        this.zoom = this.map.getZoom();
      }
      this.latLngBounds = this.map.getBounds();
    },
    onMove () {
      if (this.animFrame === null) {
        this.animFrame = L.Util.requestAnimFrame(this.setBounds, this);
      }
    },

    addContainer () {
      L.DomUtil.addClass(this.container, 'leaflet-layer');
      L.DomUtil.addClass(this.container, 'map-tiles');
      this.map.getPane('tilePane').appendChild(this.container);
    },
    removeContainer () {
      if (this.container !== null) {
        L.DomUtil.remove(this.container);
      }
      this.container = null;
    },
  },
  mounted () {
    this.container = this.$el;
    const LLayer = L.Layer.extend({});
    this.layer = new LLayer();
    this.layer.onAdd = this.addContainer;
    this.layer.onRemove = this.removeContainer;

    this.zoom = this.map.getZoom();
    this.map.on('zoomend', this.updateZoom, this);
    this.map.on('move', this.onMove, this);
    this.map.addLayer(this.layer);
  },
  beforeDestroy () {
    if (this.animFrame !== null) {
      L.Util.cancelAnimFrame(this.animFrame);
    }
    this.map.off('move', this.onMove);
    this.map.off('zoomend', this.updateZoom);
    this.removeContainer();
  },
}
</script>
