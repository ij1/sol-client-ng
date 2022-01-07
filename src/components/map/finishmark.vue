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
  name: 'FinishMark',
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
    angle: {
      type: Number,
      required: true,
    },
    markRadius: {
      type: Number,
      default: 4,
    },
  },

  computed: {
    iconCenter () {
      let size = this.markRadius;
      return [size, size];
    },
    needsRedraw () {
      this.color;
      this.markRadius;

      return Date.now();
    },
  },

  methods: {
    draw (ctx) {
      ctx.strokeStyle = this.color;
      ctx.strokeWidth = 1;

      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.moveTo(0, -this.markRadius);
      ctx.lineTo(0, this.markRadius);
      ctx.stroke();
      ctx.rotate(-this.angle);
    },
  },
}
</script>
