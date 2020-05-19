<template>
  <div
    class = "leaflet-layer"
  >
    <div
      class = "map-tiles leaflet-tile-container leaflet-zoom-animated"
      v-for = "z in zoomList"
      :id = "z"
      :key = "z"
      :ref = "'zoom' + z"
      :z-index = "z | calczindex(zoom)"
    >
      <map-tile
        v-for = "tile in tileList[z]"
        :key = "tile.displayKey"
        :tile-key-in = "tile.key"
        :id = "tile.id"
        :lng-offset = "tile.lngOffset"
      />
    </div>
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
      zoom: this.$store.state.map.zoom,
      layer: null,
      container: null,
      latLngBounds: this.map.getBounds(),
      pixelBounds: this.map.getPixelBounds(),
      padding: L.point(100, 100),       /* padding beyond the viewport */
      drawBounds: {},
      animFrame: null,
      clearTimer: null,
      tileList: {},
      zoomList: [],
    }
  },

  filters: {
    calczindex (z, zoom) {
      return 200 - Math.round(Math.abs(zoom - z) * 10);
    },
  },

  computed: {
    maxTileset() {
      if (this.$store.state.race.loaded)
        return this.$store.state.race.info.tilemap;
      else
        return 'h';
    },
  },
  methods: {
    updateDrawBounds (zoom) {
      const min = this.pixelBounds.min.subtract(this.padding);
      const max = this.pixelBounds.max.add(this.padding);
      const bounds = L.latLngBounds(this.map.unproject(min, zoom),
                                    this.map.unproject(max, zoom));
      this.drawBounds['' + zoom] = bounds;
    },
    selectTileset(zoom) {
      if ((zoom > 8) && (this.maxTileset === 'h')) {
        return 'h';
      } else if (zoom > 7) {
        return 'i';
      } else if (zoom > 5) {
        return 'l';
      }
      return 'c';
    },
    tileGridSize(tileset) {
      return this.$store.getters['tiles/tileGridSize'](tileset);
    },

    gridBounds(tileGridSize) {
      const sw = this.latLngBounds.getSouthWest();
      const ne = this.latLngBounds.getNorthEast();
      /* This usually returns one extra tile row/column because of ceil
       * but ceil+subtract 1 would return one too little if the NE point
       * matches to a tile boundary
       */
      return L.bounds(L.point((sw.lng + 180) / tileGridSize,
                              (sw.lat + 90) / tileGridSize).floor(),
                      L.point((ne.lng + 180) / tileGridSize,
                              (ne.lat + 90) / tileGridSize).ceil());
    },
    updateTileList(zoom, oldZoom = null) {
      const tileset = this.selectTileset(zoom);
      const tileGridSize = this.tileGridSize(tileset);
      const bounds = this.gridBounds(tileGridSize);
      const xSize = 360 / tileGridSize;
      /*
       * With less than 360 deg span in longitudes, reuse tiles to reduce
       * flicker when a pan across anti-meridian occurs. Still some remain
       * while the tiles are repositioned (first out, then in) but no new
       * tile needs to be created.
       */
      const reuseDisplayKeys = ((bounds.max.x - bounds.min.x) <= xSize);
      let list = [];

      /* Should probably do better ordering, that is, center first but given
       * our tiles are large and few per screenful, it probably doesn't
       * matter much.
       */
      for (let x = bounds.min.x; x < bounds.max.x; x++) {
        for (let y = bounds.min.y; y < bounds.max.y; y++) {
          let tile = {
            id: {
              l: tileset,
              z: zoom,
              x: x,                  /* Updated below */
              y: y,
            },
          };

          if (!this.isValidTile(tile.id)) {
            continue;
          }
          let displayKey = reuseDisplayKeys ? null :
                             this.$store.getters['tiles/tileIdToKey'](tile.id);
          tile.id.x = (x % xSize + xSize) % xSize;
          tile.key = this.$store.getters['tiles/tileIdToKey'](tile.id);
          tile.displayKey = reuseDisplayKeys ? tile.key : displayKey;
          tile.lngOffset = (x - tile.id.x) * tileGridSize;
          list.push(tile);
        }
      }
      this.tileList['' + zoom] = list;
      this.zoomList = [zoom];
      if (oldZoom !== null) {
        this.zoomList.push(oldZoom);
        if (this.zoom !== oldZoom) {
          this.clearTimer = setTimeout(() => {
            this.clearTimer = null;
            /* Double check that zoom still differs */
            if (this.zoom !== oldZoom) {
              this.zoomList = this.zoomList.filter(i => i !== oldZoom)
              delete this.tileList['' + oldZoom];
            }
          }, 0);
        }
      }
    },
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
      let updated = false;
      let oldZoom = null;

      if (this.zoom !== this.map.getZoom()) {
        oldZoom = this.zoom;
        this.zoom = this.map.getZoom();
        updated = true;
      }

      const bounds = this.map.getBounds();
      if (this.latLngBounds.getWest() !== bounds.getWest() ||
          this.latLngBounds.getEast() !== bounds.getEast() ||
          this.latLngBounds.getNorth() !== bounds.getNorth() ||
          this.latLngBounds.getSouth() !== bounds.getSouth()) {
        this.latLngBounds = bounds;
        updated = true;
      }

      const pxBounds = this.map.getPixelBounds();
      if (!this.pixelBounds.min.equals(pxBounds.min) ||
          !this.pixelBounds.max.equals(pxBounds.max)) {
        this.pixelBounds = pxBounds;
        updated = true;
      }
      this.animFrame = null;

      if (updated) {
        this.updateDrawBounds(this.zoom);
        this.updateTileList(this.zoom, oldZoom);
      }
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
    _animateZoom (e) {
      const center = this.map.getCenter();
      for (let zoom of this.zoomList) {
        if (typeof this.$refs['zoom' + zoom] !== 'undefined') {
          const scale = this.map.getZoomScale(e.zoom, zoom);
          const origin = this.map._getNewPixelOrigin(center, zoom);
          const newOrigin = this.map._getNewPixelOrigin(e.center, e.zoom);
          const offset = origin.multiplyBy(scale).subtract(newOrigin).round();
          L.DomUtil.setTransform(this.$refs['zoom' + zoom][0], offset, scale);
        }
      }
    },
  },
  mounted () {
    this.container = this.$el;
    const LLayer = L.Layer.extend({});
    this.layer = new LLayer();
    this.layer.onAdd = this.addContainer;
    this.layer.onRemove = this.removeContainer;
    this.layer._animateZoom = this._animateZoom;
    this.layer.options.animate = true;

    this.zoom = this.map.getZoom();
    this.map.on('zoomend', this.updateZoom, this);
    this.map.on('moveend', this.onMove, this);
    this.map.on('move', this.onMove, this);
    this.map.on('zoomanim', this._animateZoom, this);
    this.map.addLayer(this.layer);

    this.updateDrawBounds(this.zoom);
    this.updateTileList(this.zoom);
  },
  beforeDestroy () {
    if (this.animFrame !== null) {
      L.Util.cancelAnimFrame(this.animFrame);
    }
    if (this.clearTimer !== null) {
      clearTimeout(this.clearTimer);
    }
    this.map.removeLayer(this.layer);
    this.map.off('zoomanim', this._animateZoom, this);
    this.map.off('move', this.onMove, this);
    this.map.off('moveend', this.onMove, this);
    this.map.off('zoomend', this.updateZoom, this);
    this.removeContainer();
    this.layer = null;
  },
}
</script>
