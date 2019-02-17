<template>
  <div class = "leaflet-layer map-tiles">
    <map-tile
      v-for = "tile in tileDrawList"
      :key = "tile.displayKey"
      :tile-key-in = "tile.key"
      :id = "tile.id"
      :lng-offset = "tile.lngOffset"
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
      pixelBounds: this.map.getPixelBounds(),
      pixelSize: this.map.getSize(),
      animFrame: null,
    }
  },

  computed: {
    selectTileset() {
      if ((this.zoom > 8) && (this.maxTileset === 'h')) {
        return 'h';
      } else if (this.zoom > 7) {
        return 'i';
      } else if (this.zoom > 5) {
        return 'l';
      }
      return 'c';
    },
    maxTileset() {
      if (this.$store.state.race.loaded)
        return this.$store.state.race.info.tilemap;
      else
        return 'h';
    },
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
      const xSize = 360 / this.tileGridSize;
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
              x: x,                  /* Updated below */
              y: y,
            },
          };

          if (!this.isValidTile(tile.id)) {
            continue;
          }
          tile.displayKey = this.$store.getters['tiles/tileIdToKey'](tile.id);
          tile.id.x = (x % xSize + xSize) % xSize;
          tile.key = this.$store.getters['tiles/tileIdToKey'](tile.id);
          tile.lngOffset = (x - tile.id.x) * this.tileGridSize;
          list.push(tile);
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
      if (id.y < 0) {
        return false;
      }
      if (id.y * this.tileGridSize >= 180) {
        return false;
      }
      return true;
    },
    setBounds() {
      if (this.zoom !== this.map.getZoom()) {
        this.zoom = this.map.getZoom();
      }
      this.latLngBounds = this.map.getBounds();
      this.pixelBounds = this.map.getPixelBounds();
      this.pixelSize = this.map.getSize();
      this.animFrame = null;
    },

    updateZoom() {
      if (this.animFrame === null) {
        this.animFrame = L.Util.requestAnimFrame(this.setBounds, this);
      }
    },
    onMove () {
      if (this.animFrame === null) {
        this.animFrame = L.Util.requestAnimFrame(this.setBounds, this);
      }
    },

    addContainer () {
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
    this.map.on('moveend', this.onMove, this);
    this.map.on('move', this.onMove, this);
    this.map.addLayer(this.layer);
  },
  beforeDestroy () {
    if (this.animFrame !== null) {
      L.Util.cancelAnimFrame(this.animFrame);
    }
    this.map.removeLayer(this.layer);
    this.map.off('move', this.onMove, this);
    this.map.off('moveend', this.onMove, this);
    this.map.off('zoomend', this.updateZoom, this);
    this.removeContainer();
    this.layer = null;
  },
}
</script>
