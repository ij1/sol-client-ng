<template>
  <div>
    <wind-map ref = "wind-map"/>
    <steering-predictors ref = "steering-predictors"/>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import WindMap from './wind';
import SteeringPredictors from './predictors';
import { canvasAlignToPixelCenter } from '../../lib/quirks.js';

export default {
  name: 'CanvasOverlay',
  components: {
    'wind-map': WindMap,
    'steering-predictors': SteeringPredictors,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      ready: false,
      canvas: null,
      animFrame: null,
    }
  },
  computed: {
    needsRedraw () {
      this.size;

      if (this.ready) {
        this.$refs['wind-map'].needsRedraw;
        this.$refs['steering-predictors'].needsRedraw;
      }
      
      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    ...mapState({
      size: state => state.map.size,
    }),
  },
  methods: {
    onMove () {
      this.redraw();
    },
    onZoom () {
      this.redraw();
    },
    redraw () {
      let ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.ready) {
        ctx.save();
        canvasAlignToPixelCenter(ctx);
        this.$refs['wind-map'].redraw(ctx);
        ctx.restore();
        ctx.save();
        canvasAlignToPixelCenter(ctx);
        this.$refs['steering-predictors'].redraw(ctx);
        ctx.restore();
      }

      this.animFrame = null;
    },
    setCanvasSize () {
      this.canvas.width = this.size.x;
      this.canvas.height = this.size.y;
    },
    requestRedraw() {
      if (this.animFrame === null) {
        this.animFrame = L.Util.requestAnimFrame(this.redraw, this);
      }
    }
  },
  watch: {
    needsRedraw () {
      this.requestRedraw();
    },
    size () {
      this.setCanvasSize();
      this.requestRedraw();
    },
  },
  mounted () {
    this.center = this.map.getCenter();
    this.zoom = this.map.getZoom();

    this.canvas = L.DomUtil.create('canvas', 'canvas-overlay');
    this.setCanvasSize();
    this.map.getContainer().appendChild(this.canvas);

    this.map.on('move', this.onMove, this);
    this.map.on('moveend', this.onMove, this);
    this.map.on('zoom', this.onZoom, this);
    this.map.on('zoomend', this.onZoom, this);

    this.ready = true;
    this.requestRedraw();
  },
  beforeDestroy () {
    if (this.animFrame !== null) {
      L.Util.cancelAnimFrame(this.animFrame);
      this.animFrame = null;
    }
    this.ready = false;

    this.map.off('zoomend', this.onZoom, this);
    this.map.off('zoom', this.onZoom, this);
    this.map.off('moveend', this.onMove, this);
    this.map.off('move', this.onMove, this);

    this.map.getContainer().removeChild(this.canvas);
    this.canvas = null;
  },
}
</script>

<style>
.canvas-overlay {
  position: absolute;
  top: 0px;
  left: 0px;
  z-index: 550;
  mix-blend-mode: multiply;
  cursor: crosshair;
  pointer-events: none;
}
</style>
