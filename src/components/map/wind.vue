<template>
  <div v-if = 'this.$store.state.weather.loaded'>
  </div>
</template>

<script>
import L from 'leaflet'
import { UVtoTwdTws, KNT_MS } from '../../lib/sol.js'

export default {
  name: 'WindMap',
  props: {
    map: {
      type: Object,
    },
    center: {
      type: Object,
      required: true,
    },
    zoom: {
      type: Number,
      required: true,
    },
  },
  data () {
    return {
      canvas: null,
    }
  },
  computed: {
    wxTime () {
      return this.$store.state.weather.time;
    }
  },
  methods: {
    redraw () {
      if (this.canvas === null) {
        return;
      }
      const centerPoint = this.map.latLngToContainerPoint(this.center);

      const yDelta = 64;
      const xDelta = 64;
      const xInit = centerPoint.x % xDelta;
      const yInit = centerPoint.y % yDelta;

      let ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.save();
      ctx.translate(xInit, yInit);
      for (let y = yInit; y <= this.canvas.height; y += yDelta) {
        let xUndo = 0;
        for (let x = xInit; x <= this.canvas.width; x += xDelta) {
          let windPoint = null;
          windPoint = this.map.containerPointToLatLng(L.point(x, y));
          if (windPoint !== null) {
            const uv = this.$store.getters['weather/interpolateLatLng'](windPoint);
            if (uv !== undefined) {
              const tw = UVtoTwdTws(uv);

              ctx.rotate(tw[0]);
              ctx.strokeStyle = '#000000';

              const kn = tw[1] * KNT_MS;
              const lw = kn < 50 ? kn / 10 : 5;
              const len = (kn < 20 ? Math.floor(kn) : 20) + 6;

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

              ctx.rotate(-tw[0]);
            }
          }
          ctx.translate(xDelta, 0);
          xUndo -= xDelta;
        }
        ctx.translate(xUndo, yDelta);
      }
      ctx.restore();
    }
  },
  watch: {
    wxTime () {
      this.redraw();
    },
    center () {
      this.redraw();
    },
    zoom () {
      this.redraw();
    }
  },
  mounted () {
    this.canvas = L.DomUtil.create('canvas', 'wind-map');
    // FIXME: this might not be optimal way to place the canvas!
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = 0;
    this.canvas.style.left = 0;
    const size = this.map.getSize();
    this.canvas.width = size.x;
    this.canvas.height = size.y;
    this.map.getContainer().appendChild(this.canvas);
  },
  beforeDestroy () {
    this.map.getContainer().removeChild(this.canvas);
    this.canvas = null;
  },
}
</script>
