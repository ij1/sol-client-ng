<template>
  <marker-canvas
    @draw = "draw"
    :lat-lng = "latLng"
    :icon-center = "boatCenter"
    :needs-redraw = "needsRedraw"
    :pane = "paneName"
  />
</template>

<script>
import { mapState } from 'vuex';
import { boatScaleDivisor, drawBoat } from '../../lib/boatshape.js';
import { createPane } from '../../lib/quirks.js';
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
    /* Negative scales do not alter the size of the boat */
    scale: {
      type: Number,
      default: 1,
    },
    strokeWidth: {
      type: Number,
      default: 2,
    },
    map: {
      type: Object,
      required: true,
    },
  },

  data () {
    return {
      paneName: 'boatPane',
    }
  },

  computed: {
    boatCenter () {
      const size = 20 * this.finalScale;
      return [size, size];
    },
    needsRedraw () {
      this.course;
      this.twa;
      this.color;
      return Date.now();
    },
    finalScale () {
      if (this.scale < 0) {
        return -this.scale;
      }
      return this.scale * this.cfgBoatScale / boatScaleDivisor;
    },
    ...mapState({
      cfgBoatScale: state => state.map.cfg.boatScale.value,
    }),
  },

  created () {
    let pane = createPane(this.map, this.paneName);
    pane.style.zIndex = 680;
  },

  methods: {
    draw (ctx) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.strokeWidth / this.finalScale;
      ctx.scale(this.finalScale, this.finalScale);
      drawBoat(ctx, this.course, this.twa);
      ctx.scale(1/this.finalScale, 1/this.finalScale);
    },
  },
}
</script>
