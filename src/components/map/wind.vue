<template>
  <div v-if = 'this.$store.state.weather.loaded'>
  </div>
</template>

<script>
import L from 'leaflet'

export default {
  name: 'WindMap',
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      canvas: null,
      animFrame: null,
      center: null,
      zoom: null,
      redrawCnt: 0,
      gridInterval: 64,
    }
  },
  computed: {
    wxTime () {
      return this.$store.state.weather.time;
    },
    gridOrigo () {
      const centerPoint = this.map.latLngToContainerPoint(this.center);

      return L.point(centerPoint.x % this.gridInterval,
                     centerPoint.y % this.gridInterval);
    },
    needsRedraw () {
      /* Dummy access for the dependencies */
      this.canvas;
      this.wxTime;
      this.center;
      this.zoom;
      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
  },
  methods: {
    onMove () {
      this.center = this.map.getCenter();
    },
    onZoom () {
      this.zoom = this.map.getZoom();
    },
    redraw () {
      let ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.save();
      ctx.translate(this.gridOrigo.x, this.gridOrigo.y);
      for (let y = this.gridOrigo.y; y <= this.canvas.height; y += this.gridInterval) {
        let xUndo = 0;
        for (let x = this.gridOrigo.x; x <= this.canvas.width; x += this.gridInterval) {
          let windPoint = null;
          windPoint = this.map.containerPointToLatLng(L.point(x, y));
          if (windPoint !== null) {
            const wind = this.$store.getters['weather/latLngWind'](windPoint);
            if (wind !== undefined) {
              ctx.rotate(wind.twd);
              ctx.strokeStyle = '#000000';

              const lw = wind.knots < 50 ? wind.knots / 10 : 5;
              const len = (wind.knots < 20 ? Math.floor(wind.knots) : 20) + 6;

              ctx.beginPath();
              ctx.lineWidth = 1;
              ctx.lineJoin = 'miter';
              ctx.moveTo(0, 0);
              ctx.lineTo(lw+2, -lw-3);
              ctx.lineTo(-lw-2, -lw-3);
              ctx.fill();
 
              ctx.beginPath();
              ctx.lineWidth = lw+1;
              ctx.lineJoin = 'round';
              ctx.moveTo(0, -lw-2);
              ctx.lineTo(0, -len);
              ctx.stroke();

              ctx.rotate(-wind.twd);
            }
          }
          ctx.translate(this.gridInterval, 0);
          xUndo -= this.gridInterval;
        }
        ctx.translate(xUndo, this.gridInterval);
      }
      ctx.restore();
      this.animFrame = null;
    }
  },
  watch: {
    needsRedraw () {
      if (this.animFrame === null) {
        this.animFrame = L.Util.requestAnimFrame(this.redraw, this);
      }
    }
  },
  mounted () {
    this.center = this.map.getCenter();
    this.zoom = this.map.getZoom();

    this.canvas = L.DomUtil.create('canvas', 'wind-map');
    // FIXME: this might not be optimal way to place the canvas!
    this.canvas.style.zIndex = 550;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = 0;
    this.canvas.style.left = 0;
    const size = this.map.getSize();
    this.canvas.width = size.x;
    this.canvas.height = size.y;
    this.map.getContainer().appendChild(this.canvas);

    this.map.on('move', this.onMove);
    this.map.on('zoom', this.onZoom);
  },
  beforeDestroy () {
    if (this.animFrame !== null) {
      L.Util.cancelAnimFrame(this.animFrame);
    }

    this.map.off('zoom', this.onZoom);
    this.map.off('move', this.onMove);

    this.map.getContainer().removeChild(this.canvas);
    this.canvas = null;
  },
}
</script>
