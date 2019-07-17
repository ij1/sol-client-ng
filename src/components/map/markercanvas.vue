<template>
  <l-marker
    ref = "marker-container"
    :lat-lng = "latLng"
    @ready = "doReady"
  >
    <l-icon
      :icon-size = "iconSize"
      :icon-anchor = "iconCenter"
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
    }
  },

  data () {
    return {
      canvas: null,
      canvasReady: false,
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
      ctx.translate(this.iconCenter[0] + 0.5, this.iconCenter[1] + 0.5);

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

        ctx.clearRect(-(this.iconCenter[0] + 0.5),
                      -(this.iconCenter[1] + 0.5),
                      this.canvas.width, this.canvas.height);
        this.$emit('draw', ctx);
      }
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
</style>
