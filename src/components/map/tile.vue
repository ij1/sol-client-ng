<template>
  <canvas class = "leaflet-tile leaflet-tile-loaded"/>
</template>

<script>
import L from 'leaflet';
import { latLngBoundsAddOffset } from '../../lib/utils.js';

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
      this.id.z;

      return this.latLngToTilePoint(this.bounds.getSouthEast());
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
    bounds() {
      let y1 = this.maxBounds.getSouthWest().lat;
      let x1 = this.maxBounds.getSouthWest().lng;
      let y2 = this.maxBounds.getNorthEast().lat;
      let x2 = this.maxBounds.getNorthEast().lng;
      const drawBounds = latLngBoundsAddOffset(this.$parent.drawBounds['' + this.id.z],
                                               -this.lngOffset);

      /* Restrict canvas boundaries if necessary */
      if (y1 < drawBounds.getSouthWest().lat) {
        y1 = drawBounds.getSouthWest().lat;
      }
      if (x1 < drawBounds.getSouthWest().lng) {
        x1 = drawBounds.getSouthWest().lng;
      }
      if (y2 > drawBounds.getNorthEast().lat) {
        y2 = drawBounds.getNorthEast().lat;
      }
      if (x2 > drawBounds.getNorthEast().lng) {
        x2 = drawBounds.getNorthEast().lng;
      }

      return L.latLngBounds(L.latLng(y1, x1), L.latLng(y2, x2));
    },
    projectedOrigo() {
      return this.$parent.map.project(this.bounds.getNorthWest(), this.id.z).round();
    },

    needsUpdate() {
      /* Dummy access to dependencies */
      this.bounds;
      /* this.geoms is frozen, so check loaded state flag instead */
      this.loaded;
      this.id.z;

      this.$store.state.map.cfg.tinyIslands.value;
      this.$store.getters['ui/currentDayNight'];
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
    __latLngToTilePoint(mapLatLng, map) {
      return map.project(mapLatLng, this.id.z)._round()._subtract(this.projectedOrigo);
    },
    latLngToTilePoint(mapLatLng) {
      return this.__latLngToTilePoint(mapLatLng, this.$parent.map);
    },
    tileToLayerPoint() {
      const nw = this.bounds.getNorthWest();
      const displayNw = L.latLng(nw.lat, nw.lng + this.lngOffset);

      return this.$parent.map.latLngToLayerPoint(displayNw);
    },

    resetCanvasPlacement() {
      /* This layer is dying */
      if (this.$parent.map.getZoom() !== this.id.z) {
        return;
      }
      L.DomUtil.setPosition(this.$el, this.tileToLayerPoint());
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

      this.drawnZoom = this.id.z;
      this.animFrame = null;
    },
    drawPolys (ctx) {
      const map = this.$parent.map;

      const cfgTinyIslands = this.$store.state.map.cfg.tinyIslands.value;
      const detectTinyIslands = cfgTinyIslands !== 'default';
      const tinyIslandSize = cfgTinyIslands === '1px' ? 1 :
                             (cfgTinyIslands === '3px' ? 3 : 0);

      const boundN = this.maxBounds.getNorth();
      const boundS = this.maxBounds.getSouth();
      const boundE = this.maxBounds.getEast();
      const boundW = this.maxBounds.getWest();

      const isDark = this.$store.getters['ui/currentDayNight'] === 'dark';
      const landColor = !isDark ? '#ffddbb' : '#3d2b1f';
      const outlineColor = !isDark ? '#000000' : '#6f5f4f';

      ctx.save();
      let l = 1;
      while (typeof this.geoms['l' + l] !== 'undefined') {
        ctx.globalCompositeOperation = (l % 2 === 1) ?
          'source-over' : 'destination-out';
        ctx.fillStyle = landColor;
        for (let poly of this.geoms['l' + l]) {
          let first = true;
          ctx.beginPath();
          for (let pt of poly) {
            const drawCoords = this.__latLngToTilePoint(pt, map);
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
        ctx.strokeStyle = outlineColor;
        for (let poly of this.geoms['l' + l]) {
          ctx.fillStyle = outlineColor;
          let first = true;
          let prevAtBorder = 0;
          let firstAtBorder;
          let polyMinX;
          let polyMinY;
          let polyMaxX;
          let polyMaxY;
          let tinyIsland = (l % 2 === 1) && detectTinyIslands;
          ctx.beginPath();
          for (let pt of poly) {
            const atBorder =
              (pt.lat === boundN ? 1 :
               (pt.lat === boundS ? 4 : 0)) +
              (pt.lng === boundE ? 2 :
               (pt.lng === boundW ? 8 : 0));

            const drawCoords = this.__latLngToTilePoint(pt, map);

            /* Larger than a tiny island (<=1px) detection */
            if (first) {
              polyMinX = drawCoords.x;
              polyMaxX = drawCoords.x;
              polyMinY = drawCoords.y;
              polyMaxY = drawCoords.y;
            } else if (tinyIsland) {
              if (polyMinX > drawCoords.x) {
                polyMinX = drawCoords.x;
              }
              if (polyMaxX < drawCoords.x) {
                polyMaxX = drawCoords.x;
              }
              if (polyMinY > drawCoords.y) {
                polyMinY = drawCoords.y;
              }
              if (polyMaxY < drawCoords.y) {
                polyMaxY = drawCoords.y;
              }
              tinyIsland = ((polyMaxX - polyMinX) < tinyIslandSize) &&
                           ((polyMaxY - polyMinY) < tinyIslandSize);
            }

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

          if (tinyIsland) {
            if (isDark) {
              ctx.fillStyle = '#ffffff';
            }
            const startX = Math.round((polyMaxX - polyMinX) / 2) + polyMinX;
            const startY = Math.round((polyMaxY - polyMinY) / 2) + polyMinY;
            if (cfgTinyIslands === '1px') {
              ctx.fillRect(startX, startY, 1, 1);
            } else if (cfgTinyIslands === '3px') {
              ctx.fillRect(startX-1, startY-1, 3, 3);
            }
          } else {
            /* Complete the poly but only conditionally */
            if ((firstAtBorder & prevAtBorder) === 0) {
              const drawCoords = this.__latLngToTilePoint(poly[0], map);
              ctx.lineTo(drawCoords.x, drawCoords.y);
            }
            ctx.stroke();
          }
        }

        l++;
      }
      ctx.restore();
    },
    drawGraticules (ctx) {
      /* Draw a graticule lines */
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(127, 127, 127, 0.8)';
      ctx.moveTo(0, 0);
      ctx.lineTo(0, this.tilesize.y);
      ctx.moveTo(0, 0);
      ctx.lineTo(this.tilesize.x, 0);
      ctx.moveTo(0, 0);
      ctx.stroke();
    },
  },

  beforeCreate () {
    /* Props not yet initialized but addTile must occur before computed
     * (reactivity) is setup to avoid undefined tile errors from them
     */
    if (typeof this.$store.state.tiles.tiles[this.$options.propsData.tileKeyIn] === 'undefined') {
      this.$store.commit('tiles/addTile', this.$options.propsData.id);
      this.$store.dispatch('tiles/loadTiles');
    } else {
      this.$store.commit('tiles/lockTile', this.$options.propsData.id);
    }
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
