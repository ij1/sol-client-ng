<template>
  <marker-canvas
    @draw = "draw"
    :lat-lng = "latLng"
    :icon-center = "boatCenter"
    :needs-redraw = "needsRedraw"
  />
</template>

<script>
import { drawBoat } from '../../lib/boatshape.js';
import MarkerCanvas from './markercanvas.vue';

export default {
  name: 'SailBoat',
  components: {
    'marker-canvas': MarkerCanvas,
  },

  props: {
    latLng: {
      type: Object,
      required: true,
    },
    course: {
      type: Number,
      required: true,
    },
    twa: {
      type: Number,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    scale: {
      type: Number,
      default: 1,
    },
    strokeWidth: {
      type: Number,
      default: 2,
    },
  },

  computed: {
    boatCenter () {
      const size = 20 * this.scale;
      return [size, size];
    },
    needsRedraw () {
      this.course;
      this.twa;
      return Date.now();
    },
  },

  methods: {
    draw (ctx) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.strokeWidth / this.scale;
      ctx.scale(this.scale, this.scale);
      drawBoat(ctx, this.course, this.twa);
      ctx.scale(1/this.scale, 1/this.scale);
    },
  },
}
</script>
