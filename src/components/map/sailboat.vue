<template>
  <marker-canvas
    @draw = "draw"
    :lat-lng = "latLng"
    :icon-center = "boatCenter"
    :needs-redraw = "needsRedraw"
  />
</template>

<script>
import { radToDeg } from '../../lib/utils.js';
import { boatPath, sailPath, sailAngle, sailOffset } from '../../lib/boatshape.js';
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
    boatPath () {
      return new Path2D(boatPath(this.scale));
    },
    sailPath () {
      return new Path2D(sailPath(radToDeg(this.twa), this.scale));
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
      ctx.lineWidth = this.strokeWidth;

      ctx.rotate(this.course);
      ctx.stroke(this.boatPath);

      const sangle = sailAngle(this.twa);
      ctx.translate(0, sailOffset);
      ctx.rotate(sangle);
      ctx.stroke(this.sailPath);
      ctx.rotate(-sangle);
      ctx.translate(0, -sailOffset);

      ctx.rotate(-this.course);
    },
  },
}
</script>
