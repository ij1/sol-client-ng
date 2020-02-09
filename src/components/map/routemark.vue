<template>
  <marker-canvas
    @draw = "draw"
    :lat-lng = "latLng"
    :icon-center = "iconCenter"
    :needs-redraw = "needsRedraw"
  >
    <slot></slot>
  </marker-canvas>
</template>

<script>
import MarkerCanvas from './markercanvas.vue';

export default {
  name: 'RouteMark',
  components: {
    'marker-canvas': MarkerCanvas,
  },

  props: {
    latLng: {
      type: Object,
      required: true,
    },
    color: {
      type: String,
      default: 'red',
    },
    markRadius: {
      type: Number,
      default: 4,
    },
    roundingSide: {
      type: String,
    },
    roundingArrowAngle: {
      type: Number,
    },
    roundingArrowRadius: {
      type: Number,
      default: 10,
    },
    roundingArrowSize: {
      type: Number,
      default: 5,
    },
  },

  computed: {
    iconCenter () {
      let size;
      if (typeof this.roundingArrowAngle === 'undefined') {
        size = this.markRadius;
      } else {
        size = this.roundingArrowRadius + this.roundingArrowSize;
      }
      return [size, size];
    },
    needsRedraw () {
      this.color;
      this.markRadius;
      this.roundingSide;
      this.roundingArrowAngle;
      this.roundingArrowRadius;
      this.roundingArrowSize;

      return Date.now();
    },
  },

  methods: {
    draw (ctx) {
      ctx.fillStyle = this.color;
      ctx.strokeStyle = this.color;
      ctx.strokeWidth = 1;

      ctx.beginPath();
      ctx.arc(0, 0, this.markRadius, 0, 2 * Math.PI);
      ctx.fill();

      if (typeof this.roundingArrowAngle !== 'undefined') {
        let arrowDir = (this.roundingSide === 'Port') ? -1 : 1;
        ctx.rotate(this.roundingArrowAngle);
        ctx.beginPath();
        ctx.moveTo(-4 * arrowDir, -5);
        ctx.lineTo(1 * arrowDir, -10);
        ctx.lineTo(-4 * arrowDir, -15);
        ctx.stroke();
        ctx.rotate(-this.roundingArrowAngle);
      }
    },
  },
}
</script>
