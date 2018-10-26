<template>
  <canvas/>
</template>

<script>
import L from 'leaflet';

export default {
  name: 'MapTile',
  // FIXME: maybe I need to watch + shadow copy these to avoid computed
  // recalcs?
  props: {
    id: {
      type: Object,
      required: true,
    },
    tileKeyIn: {
      type: String,
      required: true,
    },
  },
  data () {
    return {
      tileKey: null,
      drawnZoom: null,
      animFrame: null,
    }
  },

  computed: {
    geoms () {
      if (this.tileKey === null) {
        return {}
      }
      return this.$store.state.tiles.tiles[this.tileKey].geoms;
    },
    loading () {
      if (this.tileKey === null) {
        return false;
      }
      return this.$store.state.tiles.tiles[this.tileKey].loading;
    },
    tilesize() {
      /* Dummy access to dependency */
      this.$parent.zoom;

      return this.latLngToTilePoint(this.bounds.getSouthEast()).floor();
    },

    // FIXME: move to sol.js
    gridSize () {
      const degrees = {c: 45, l: 10, h: 1};
      return degrees[this.id.l];
    },
    bounds() {
      return L.latLngBounds(
        L.latLng(this.id.y * this.gridSize - 90,
                 this.id.x * this.gridSize - 180),
        L.latLng((this.id.y + 1) * this.gridSize - 90,
                 (this.id.x + 1) * this.gridSize - 180)
      );
    },

    needsUpdate() {
      /* Dummy access to dependencies */
      /* this.geoms is frozen, so check loading state flag instead */
      this.loading;
      // CHECKME: Is this reactive?
      this.$parent.zoom;
      // Return dummy value
      return Date.now();
    }
  },
  watch: {
    needsUpdate () {
      this.drawTile();
    },
  },

  methods: {
    latLngToTilePoint(latLng) {
      const origo = this.$parent.map.project(this.bounds.getNorthWest());
      let tgt = this.$parent.map.project(latLng);
      return tgt.subtract(origo);
    },
    tileToLayerPoint() {
      return this.$parent.map.latLngToLayerPoint(this.bounds.getNorthWest());
    },

    resetCanvasPlacement() {
      // FIXME, refing canvas element
      L.DomUtil.setPosition(this.$el, this.tileToLayerPoint().floor());
      this.$el.width = this.tilesize.x;
      this.$el.height = this.tilesize.y;
    },

    drawTile () {
      if (this.animFrame === null) {
        this.animFrame = L.Util.requestAnimFrame(this._drawTile, this);
      }
    },
    _drawTile () {
      this.resetCanvasPlacement();

      let ctx = this.$el.getContext('2d');

      ctx.save();
      let l = 1;
      while (typeof this.geoms['l' + l] !== 'undefined') {
        ctx.fillStyle = '#ffddbb';
        for (let poly of this.geoms['l' + l]) {
          let first = true;
          ctx.beginPath();
          for (let pt of poly) {
            // CHECKME: round the pixel coordinate or not?
            const drawCoords = this.latLngToTilePoint(pt).round();
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
        for (let poly of this.geoms['l' + l]) {
          let first = true;
          let prevAtBorder = false;
          let firstAtBorder;
          ctx.beginPath();
          for (let pt of poly) {
            // CHECKME: round the pixel coordinate or not?
            const atBorder = (pt.lat === this.bounds.getNorth()) ||
                             (pt.lat === this.bounds.getSouth()) ||
                             (pt.lng === this.bounds.getWest()) ||
                             (pt.lng === this.bounds.getEast());
            // CHECKME: round the pixel coordinate or not?
            const drawCoords = this.latLngToTilePoint(pt).round();
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
            const drawCoords = this.latLngToTilePoint(poly[0]).round();
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
      ctx.lineTo(0, this.tilesize.y);
      ctx.moveTo(0, 0);
      ctx.lineTo(this.tilesize.x, 0);
      ctx.moveTo(0, 0);
      ctx.stroke();
   
      this.drawnZoom = this.$parent.zoom;
      this.animFrame = null;
    },
  },

  created () {
    this.tileKey = this.tileKeyIn;
  },
  mounted () {
    this.$store.dispatch('tiles/loadTile', this.id);
    this.drawTile();
    L.DomUtil.addClass(this.$el, 'leaflet-tile');
    L.DomUtil.addClass(this.$el, 'leaflet-tile-loaded');
  },
  beforeDestroy () {
    if (this.animFrame !== null) {
      L.Util.cancelAnimFrame(this.animFrame);
    }
  },
}
</script>
