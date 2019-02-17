<template>
  <canvas class = "leaflet-tile leaflet-tile-loaded"/>
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

    lngOffset: {
      type: Number,
      default: 0,
    },
  },
  data () {
    return {
      tileKey: this.tileKeyIn,
      drawnZoom: null,
      animFrame: null,
    }
  },

  computed: {
    geoms () {
      return this.$store.state.tiles.tiles[this.tileKey].geoms;
    },
    loaded () {
      return this.$store.state.tiles.tiles[this.tileKey].loaded;
    },
    tilesize() {
      /* Dummy access to dependency */
      this.$parent.zoom;

      return this.latLngToTilePoint(this.bounds.getSouthEast()).floor();
    },

    tileGridSize () {
      return this.$store.getters['tiles/tileGridSize'](this.id.l);
    },
    maxBounds () {
      let y1 = this.id.y * this.tileGridSize - 90;
      let x1 = this.id.x * this.tileGridSize - 180;
      let y2 = (this.id.y + 1) * this.tileGridSize - 90;
      let x2 = (this.id.x + 1) * this.tileGridSize - 180;

      return L.latLngBounds(L.latLng(y1, x1), L.latLng(y2, x2));
    },
    /* Reserve 100px extra beyond the viewport for panning */
    drawBounds () {
      const min = this.$parent.pixelBounds.min.subtract(L.point(100, 100));
      const max = this.$parent.pixelBounds.max.add(L.point(100, 100));
      const bounds = L.latLngBounds(this.$parent.map.unproject(min),
                                    this.$parent.map.unproject(max));
      return bounds;
    },
    bounds() {
      let y1 = this.maxBounds.getSouthWest().lat;
      let x1 = this.maxBounds.getSouthWest().lng;
      let y2 = this.maxBounds.getNorthEast().lat;
      let x2 = this.maxBounds.getNorthEast().lng;

      /* Restrict canvas boundaries if necessary */
      if (y1 < this.drawBounds.getSouthWest().lat) {
        y1 = this.drawBounds.getSouthWest().lat;
      }
      if (x1 < this.drawBounds.getSouthWest().lng) {
        x1 = this.drawBounds.getSouthWest().lng;
      }
      if (y2 > this.drawBounds.getNorthEast().lat) {
        y2 = this.drawBounds.getNorthEast().lat;
      }
      if (x2 > this.drawBounds.getNorthEast().lng) {
        x2 = this.drawBounds.getNorthEast().lng;
      }

      return L.latLngBounds(L.latLng(y1, x1), L.latLng(y2, x2));
    },
    projectedOrigo() {
      this.$parent.zoom;
      return this.$parent.map.project(this.bounds.getNorthWest());
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
      return this.$parent.map.project(latLng).subtract(this.projectedOrigo);
    },
    tileToLayerPoint() {
      const nw = this.bounds.getNorthWest();
      const displayNw = L.latLng(nw.lat, nw.lng + this.lngOffset);

      return this.$parent.map.latLngToLayerPoint(displayNw);
    },

    resetCanvasPlacement() {
      // FIXME, refing canvas element
      L.DomUtil.setPosition(this.$el, this.tileToLayerPoint().floor());
      this.$el.width = this.tilesize.x;
      this.$el.height = this.tilesize.y;
    },

    drawTile () {
      if (typeof this.$el === 'undefined') {
        return;
      }
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
        ctx.globalCompositeOperation = (l % 2 === 1) ?
          'source-over' : 'destination-out';
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
        ctx.globalCompositeOperation = 'source-over';
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
      }
      ctx.restore();
    },
    drawGraticules (ctx) {
      /* Draw a graticule lines */
      ctx.beginPath();
      ctx.strokeStyle = 'rgb(127, 127, 127, 0.8)';
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
      if (pt.lat === this.maxBounds.getNorth()) {
        atBorder += 1;
      } else if (pt.lat === this.maxBounds.getSouth()) {
        atBorder += 4;
      }
      if (pt.lng === this.maxBounds.getEast()) {
        atBorder += 2;
      } else if (pt.lng === this.maxBounds.getWest()) {
        atBorder += 8;
      }
      return atBorder;
    },
  },

  beforeCreate () {
    /* Props not yet initialized but addTile must occur before computed
     * (reactivity) is setup to avoid undefined tile errors from them
     */
    this.$store.commit('tiles/addTile', this.$options.propsData.id);
  },
  created () {
    this.$store.dispatch('tiles/loadTile', this.id);
  },
  mounted () {
    this.drawTile();
  },
  beforeDestroy () {
    if (this.animFrame !== null) {
      L.Util.cancelAnimFrame(this.animFrame);
    }
  },
  destroyed () {
    this.$store.commit('tiles/unlockTile', this.id);
  }
}
</script>
