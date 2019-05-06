<template>
  <marker-canvas
    @draw = "draw"
    :lat-lng = "latLng"
    :icon-center = "polarCenter"
    :needs-redraw = "needsRedraw"
  />
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import MarkerCanvas from './markercanvas.vue';
import { polarMixin } from '../mixins/polar.js';

export default {
  name: 'MapPolar',
  components: {
    'marker-canvas': MarkerCanvas,
  },
  mixins: [polarMixin],
  props: {
    latLng: {
      type: Object,
      required: true,
    },
    twd: {
      type: Number,
      required: true,
    },
  },

  data () {
    return {
      polarHeadroom: 1.05,
    }
  },

  computed: {
    polarSize () {
      /* Up to half of the visual map area or 400 px */
      let size = Math.min(Math.max(this.mapSize.x, this.mapSize.y) * 0.5, 400);

      return Math.ceil(size / 2);
    },
    polarCenter () {
      return [this.polarSize, this.polarSize];
    },
    polarScale () {
      return this.polarSize / this.polarHeadroom / this.polarCurve.maxspeed.speed;
    },
    needsRedraw () {
      if (this.showPolar) {
        this.polarCurve;
        this.twd;
      }
      return Date.now();
    },
    ...mapState({
      mapSize: state => state.map.size,
      showPolar: state => state.boat.steering.visualSteering.showPolar,
    }),
    ...mapGetters({
      polarCurve: 'boat/polar/currentCurve',
    }),
  },

  methods: {
    draw (ctx) {
      if (!this.showPolar) {
        return;
      }

      ctx.rotate(this.twd);
      ctx.lineWidth = 1;

      /* Port */
      ctx.strokeStyle = '#ff0000';
      this.drawPolarCurve(ctx, this.polarCurve, this.polarScale);

      /* Starboard */
      ctx.strokeStyle = '#00ff00';
      ctx.scale(-1, 1);
      this.drawPolarCurve(ctx, this.polarCurve, this.polarScale);
      ctx.scale(-1, 1);

      ctx.rotate(-this.twd);
    },
  },
}
</script>