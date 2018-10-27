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
    loaded () {
      if (this.tileKey === null) {
        return false;
      }
      return this.$store.state.tiles.tiles[this.tileKey].loaded;
    },
    tilesize() {
      /* Dummy access to dependency */
      this.$parent.zoom;

      return this.latLngToTilePoint(this.bounds.getSouthEast()).floor();
    },

    // FIXME: mapgetters
    tileGridSize () {
      return this.$store.getters['tiles/tileGridSize'](this.id.l);
    },
    maxBounds () {
      const min = this.$parent.pixelBounds.min.subtract(this.$parent.pixelSize);
      const max = this.$parent.pixelBounds.max.add(this.$parent.pixelSize);
      const bounds = L.latLngBounds(this.$parent.map.unproject(min),
                                    this.$parent.map.unproject(max));
      return bounds;
    },
    bounds() {
      let y1 = this.id.y * this.tileGridSize - 90;
      let x1 = this.id.x * this.tileGridSize - 180;
      let y2 = (this.id.y + 1) * this.tileGridSize - 90;
      let x2 = (this.id.x + 1) * this.tileGridSize - 180;

      /* Restrict canvas boundaries if necessary */
      if (y1 < this.maxBounds.getSouthWest().lat) {
        y1 = this.maxBounds.getSouthWest().lat;
      }
      if (x1 < this.maxBounds.getSouthWest().lng) {
        x1 = this.maxBounds.getSouthWest().lng;
      }
      if (y2 > this.maxBounds.getNorthEast().lat) {
        y2 = this.maxBounds.getNorthEast().lat;
      }
      if (x2 > this.maxBounds.getNorthEast().lng) {
        x2 = this.maxBounds.getNorthEast().lng;
      }

      return L.latLngBounds(L.latLng(y1, x1), L.latLng(y2, x2));
    },

    needsUpdate() {
      /* Dummy access to dependencies */
      this.bounds;
      /* this.geoms is frozen, so check loaded state flag instead */
      this.loaded;
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
      this.drawPolys(ctx);
      this.drawGraticules(ctx);
    },
    drawPolys (ctx) {
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
          let prevAtBorder = 0;
          let firstAtBorder;
          ctx.beginPath();
          for (let pt of poly) {
            // CHECKME: round the pixel coordinate or not?
            const atBorder = this.pointAtBorder(pt);
            // CHECKME: round the pixel coordinate or not?
            const drawCoords = this.latLngToTilePoint(pt).round();
            /* If the outline goes along a border line, don't draw but move */
            if (first || (atBorder & prevAtBorder) !== 0) {
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
          if ((firstAtBorder & prevAtBorder) === 0) {
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
    },
    drawGraticules (ctx) {
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
    pointAtBorder(pt) {
      let atBorder = 0;
      if (pt.lat === this.bounds.getNorth()) {
        atBorder += 1;
      } else if (pt.lat === this.bounds.getSouth()) {
        atBorder += 4;
      }
      if (pt.lng === this.bounds.getEast()) {
        atBorder += 2;
      } else if (pt.lng === this.bounds.getWest()) {
        atBorder += 8;
      }
      return atBorder;
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
