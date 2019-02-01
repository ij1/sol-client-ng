<template>
  <div>
    <wind-map ref = "wind-map"/>
    <steering-predictors ref = "steering-predictors"/>
  </div>
</template>

<script>
import L from 'leaflet';
import WindMap from './wind';
import SteeringPredictors from './predictors';

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
      size: null,
      animFrame: null,
      center: null,
      zoom: null,
      redrawCnt: 0,
    }
  },
  computed: {
    needsRedraw () {
      /* Dummy access for the dependencies */
      this.center;
      this.zoom;

      if (this.ready) {
        this.$refs['wind-map'].needsRedraw;
        this.$refs['steering-predictors'].needsRedraw;
      }
      
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

      if (this.ready) {
        ctx.save();
        this.$refs['wind-map'].redraw(ctx);
        ctx.restore();
        ctx.save();
        this.$refs['steering-predictors'].redraw(ctx);
        ctx.restore();
      }

      this.animFrame = null;
    },
    onResize() {
      this.size = this.map.getSize();
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
    }
  },
  mounted () {
    this.center = this.map.getCenter();
    this.zoom = this.map.getZoom();

    this.canvas = L.DomUtil.create('canvas', 'canvas-overlay');
    // FIXME: this might not be optimal way to place the canvas!
    this.canvas.style.zIndex = 550;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = 0;
    this.canvas.style.left = 0;
    this.onResize();
    this.map.getContainer().appendChild(this.canvas);

    this.map.on('move', this.onMove, this);
    this.map.on('moveend', this.onMove, this);
    this.map.on('zoom', this.onZoom, this);
    this.map.on('zoomend', this.onZoom, this);
    this.map.on('resize', this.onResize, this);

    this.ready = true;
    this.requestRedraw();
  },
  beforeDestroy () {
    if (this.animFrame !== null) {
      L.Util.cancelAnimFrame(this.animFrame);
      this.animFrame = null;
    }
    this.ready = false;

    this.map.off('resize', this.onResize);
    this.map.off('zoomend', this.onZoom);
    this.map.off('zoom', this.onZoom);
    this.map.off('moveend', this.onMove);
    this.map.off('move', this.onMove);

    this.map.getContainer().removeChild(this.canvas);
    this.canvas = null;
  },
}
</script>
