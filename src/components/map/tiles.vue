<template>
  <div/>
</template>

<script>
import L from 'leaflet';

export default {
  name: 'MapTiles',
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
      tiles: {},
      urlBase: '/site_media/maps/tiles/',
    }
  },

  computed: {
    selectTileset() {
      // FIXME: check these zoom levels and tweak if necessary
      if (this.zoom > 12) {
        return 'h';
      } else if (this.zoom > 5) {
        return 'l';
      }
      return 'c';
    },
    gridSize () {
      const degrees = {c: 45, l: 10, h: 1};
      return degrees[this.selectTileset];
    }
  },

  methods: {
    tileIdToUrl(id) {
      return this.urlBase + id.l + '/' + id.x + '_' + id.y + '.xml.z';
    },
    tileIdToKey(id) {
      return id.l + ':' + id.x + ':' + id.y;
    },
    tileIdToBounds(id) {
      return L.latLngBounds(
        L.latLng(id.y * this.gridSize - 90,
                 id.x * this.gridSize - 180),
        L.latLng((id.y + 1) * this.gridSize - 90,
                 (id.x + 1) * this.gridSize - 180)
      );
    },

    /* WARNING: this does not check the l but uses the current one directly
     * but it should be enough for our usecases
     */
    isValidTile (id) {
      if (id.x < 0 || id.y < 0) {
        return false;
      }
      if ((id.x * this.gridSize >= 360) ||
          (id.y * this.gridSize >= 180)) {
        return false;
      }
      return true;
    },
    latLngToTilePoint(latLng, tile) {
      const origo = this.map.project(tile.bounds.getNorthWest());
      let tgt = this.map.project(latLng);
      return tgt.subtract(origo);
    },
    tileToLayerPoint(tile) {
      return this.map.latLngToLayerPoint(tile.bounds.getNorthWest());
    },

    tileCanvasResetPlacement(tile) {
      L.DomUtil.setPosition(tile.canvas, this.tileToLayerPoint(tile).floor());
      tile.tilesize = this.latLngToTilePoint(tile.bounds.getSouthEast(),
                                             tile).floor();
      tile.canvas.width = tile.tilesize.x;
      tile.canvas.height = tile.tilesize.y;
    },
    addTile (id) {
      let tile = {
        id: id,
        bounds: this.tileIdToBounds(id),
        tilesize: null,
        canvas: null,
        drawnZoom: null,
        geoms: {},
      };

      tile.canvas = L.DomUtil.create('canvas', 'leaflet-tile leaflet-tile-loaded map-tile'),
      this.tileCanvasResetPlacement(tile);
      this.tiles[this.tileIdToKey(id)] = tile;
      this.container.appendChild(tile.canvas);
      /* Graticules must be drawn even if there's no data yet */
      this.drawTile(tile);

      this.loadTile(id);
    },
    loadTile (id) {
      const getDef = {
        url: this.tileIdToUrl(id),
        params: {},
        useArrays: true,
        dataField: 'data',
        compressedPayload: true,

        dataHandler: (data) => {
          var geoms = {};
          const tileKey = this.tileIdToKey(id);

          if (typeof data.cell[0].poly !== 'undefined') {
            for (let poly of data.cell[0].poly) {
              var geom = [];
              for (let pt of poly.point) {
                geom.push(L.latLng(pt.$.lat, pt.$.lon));
              }

              const level = 'l' + poly.$.level;
              if (typeof geoms[level] === 'undefined') {
                geoms[level] = [];
              }
              geoms[level].push(geom);
            }
          }

          this.tiles[tileKey].geoms = geoms;
          // FIXME: move drawing into animFrame
          this.drawTile(this.tiles[tileKey]);
        }
      };
      this.$store.dispatch('solapi/get', getDef);
    },

    drawTile (tile) {
      let ctx = tile.canvas.getContext('2d');
      ctx.clearRect(0, 0, tile.canvas.width, tile.canvas.height);

      ctx.save();
      let l = 1;
      while (typeof tile.geoms['l' + l] !== 'undefined') {
        ctx.fillStyle = '#ffddbb';
        for (let poly of tile.geoms['l' + l]) {
          let first = true;
          ctx.beginPath();
          for (let pt of poly) {
            // CHECKME: round the pixel coordinate or not?
            const drawCoords = this.latLngToTilePoint(pt, tile).round();
            if (first) {
              ctx.moveTo(drawCoords.x, drawCoords.y);
              first = false;
            } else {
              ctx.lineTo(drawCoords.x, drawCoords.y);
            }
          }
          ctx.fill();
        }

        /* Draw outline */
        ctx.strokeStyle = '#000';
        for (let poly of tile.geoms['l' + l]) {
          let first = true;
          let prevAtBorder = false;
          let firstAtBorder;
          ctx.beginPath();
          for (let pt of poly) {
            // CHECKME: round the pixel coordinate or not?
            const atBorder = (pt.lat === tile.bounds.getNorth()) ||
                             (pt.lat === tile.bounds.getSouth()) ||
                             (pt.lng === tile.bounds.getWest()) ||
                             (pt.lng === tile.bounds.getEast());
            // CHECKME: round the pixel coordinate or not?
            const drawCoords = this.latLngToTilePoint(pt, tile).round();
            /* If the outline goes along the border, don't draw but move */
            if (first || (atBorder && prevAtBorder)) {
              ctx.moveTo(drawCoords.x, drawCoords.y);
              if (first) {
                firstAtBorder = atBorder;
              }
              first = false;
            } else {
              ctx.lineTo(drawCoords.x, drawCoords.y);
            }
            prevAtBorder = atBorder;
          }
          /* Complete the poly but only conditionally */
          if (!firstAtBorder || !prevAtBorder) {
            // CHECKME: round the pixel coordinate or not?
            const drawCoords = this.latLngToTilePoint(poly[0], tile).round();
            ctx.lineTo(drawCoords.x, drawCoords.y);
          }
          ctx.stroke();
        }

        l++;
        // FIXME: other levels are not correctly handled just yet, thus break
        break;
      }
      ctx.restore();

      /* Draw a graticule lines */
      ctx.beginPath();
      ctx.strokeStyle = '#aaa';
      ctx.moveTo(0, 0);
      ctx.lineTo(0, tile.tilesize.y);
      ctx.moveTo(0, 0);
      ctx.lineTo(tile.tilesize.x, 0);
      ctx.moveTo(0, 0);
      ctx.stroke();
   
      tile.drawnZoom = this.zoom;
    },
    tileToScreen(id) {
      const tileKey = this.tileIdToKey(id);
      if (typeof this.tiles[tileKey] === 'undefined') {
        this.addTile(id);
      } else {
        if (this.tiles[tileKey].drawnZoom !== this.zoom) {
          // FIXME: move drawing into animFrame
          this.tileCanvasResetPlacement(this.tiles[tileKey]);
          this.drawTile(this.tiles[tileKey]);
        }
      }
    },

    gridBounds() {
      const latLngBounds = this.map.getBounds();
      const sw = latLngBounds.getSouthWest();
      const ne = latLngBounds.getNorthEast();
      /* This usually returns one extra tile row/column because of ceil
       * but ceil+subtract 1 would return one too little if the NE point
       * matches to a tile boundary
       */
      return L.bounds(L.point((sw.lng + 180) / this.gridSize,
                              (sw.lat + 90) / this.gridSize).floor(),
                      L.point((ne.lng + 180) / this.gridSize,
                              (ne.lat + 90) / this.gridSize).ceil());
    },
    update () {
      const tileset = this.selectTileset;
      const bounds = this.gridBounds();

      /* Should probably do better ordering, that is, center first but given
       * our tiles are large and few per screenful, it probably doesn't
       * matter much.
       */
      for (let x = bounds.min.x; x < bounds.max.x; x++) {
        for (let y = bounds.min.y; y < bounds.max.y; y++) {
          const tileId = {
            l: tileset,
            x: x,
            y: y,
          };

          if (!this.isValidTile(tileId)) {
            // FIXME: how to do wraps with canvases? Maybe copy canvases
            // somewhere?
            continue;
          }
          this.tileToScreen(tileId);
        }
      }
    },

    updateZoom() {
      if (this.zoom != this.map.getZoom()) {
        this.zoom = this.map.getZoom();
        this.update();
      }
    },
    // ADDME: pruning tiles (or just canvases) to save some memory
    //
    removeAllTiles() {
      // ADDME, low-prio though as map should never teardown
    },
    addContainer () {
      this.container = L.DomUtil.create('div', 'leaflet-layer map-tiles');
      this.map.getPane('tilePane').appendChild(this.container);
    },
    removeContainer () {
      this.removeAllTiles();
      if (this.container !== null) {
        L.DomUtil.remove(this.container);
      }
      this.container = null;
    },
  },
  mounted () {
    const LLayer = L.Layer.extend({});
    this.layer = new LLayer();
    this.layer.onAdd = this.addContainer;
    this.layer.onRemove = this.removeContainer;

    this.zoom = this.map.getZoom();
    this.map.on('zoomend', this.updateZoom, this);
    this.map.addLayer(this.layer);
  },
  beforeDestroy () {
    this.map.off('zoomend', this.updateZoom);
    this.removeContainer();
  },
}
</script>
