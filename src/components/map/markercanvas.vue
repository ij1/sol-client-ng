<template>
  <l-marker
    ref = "marker-container"
    :key = "recreateHack"
    :lat-lng = "latLng"
    :options = "markerOptions"
    :pane = "pane"
    @ready = "doReady"
  >
    <l-icon
      :icon-size = "iconSize"
      :icon-anchor = "iconCenter"
      :options = "markerOptions"
    >
      <canvas
        :width = 'iconSize[0]'
        :height = 'iconSize[1]'
        class = "marker-canvas"
      />
    </l-icon>
    <slot></slot>
  </l-marker>
</template>

<script>
import { LIcon, LMarker } from 'vue2-leaflet';
import { canvasAlignToPixelValue } from '../../lib/quirks.js';

export default {
  name: 'MarkerCanvas',
  components: {
    'l-icon': LIcon,
    'l-marker': LMarker,
  },

  props: {
    latLng: {
      type: Object,
      required: true,
    },
    iconCenter: {
      type: Array,
      default: () => ([0, 0]),
    },
    needsRedraw: {
      type: Number,
      default: 0,
    },
    pane: {
      type: String,
      default: 'markerPane',
    },
  },

  data () {
    return {
      canvas: null,
      canvasReady: false,
      markerOptions: {
        className: 'marker-nopointer',
      },
      recreateHack: 0,
    }
  },

  computed: {
    iconSize () {
      return this.iconCenter.map(x => x * 2 + 1);
    },

  },
  methods: {
    initCanvas () {
      let ctx = this.canvas.getContext('2d');
      ctx.translate(this.iconCenter[0] + canvasAlignToPixelValue,
                    this.iconCenter[1] + canvasAlignToPixelValue);

      this.$emit('draw', ctx);
    },
    doReady (mapObject) {
      this.$nextTick(() => {
        this.canvas = mapObject.getElement().firstChild;
        this.canvasReady = true;
        this.initCanvas();
      });
    },
  },
  watch: {
    needsRedraw () {
      if (this.canvasReady) {
        let ctx = this.canvas.getContext('2d');

        ctx.clearRect(-(this.iconCenter[0] + canvasAlignToPixelValue),
                      -(this.iconCenter[1] + canvasAlignToPixelValue),
                      this.canvas.width, this.canvas.height);
        this.$emit('draw', ctx);
      }
    },
    /*
     * When canvas size changes, limitations in Vue2Leaflet marker
     * handling prevent the canvas from working. Thus we need to
     * discard the marker and recreate.
     */
    iconSize () {
      this.canvasReady = false;
      this.canvas = null;
      this.recreateHack++;
    },
  }
}
</script>

<style>
.marker-canvas {
  position: absolute;
  top: 0px;
  left: 0px;
  cursor: crosshair;
}

.marker-nopointer {
  pointer-events: none !important;
}
</style>
