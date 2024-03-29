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
    tws: {
      type: Number,
    },
    showPolar: {
      type: Boolean,
      default: true,
    },
    useCurrentCurve: {
      type: Boolean,
      default: true,
    },
  },

  data () {
    return {
      maxPolarSize: 400,
      polarHeadroom: 1.05,
    }
  },

  computed: {
    polarSize () {
      /* Up to half of the visual map area or 400 px */
      let size = Math.min(Math.min(this.mapSize.x, this.mapSize.y) * 0.5,
                          this.maxPolarSize);

      return Math.ceil(size / 2);
    },
    /* Return constant values here to avoid resizing / recentering the
     * marker icon which causes DOM rewrite to take place (a new canvas
     * gets created).
     */
    polarCenter () {
      const size = Math.ceil(this.maxPolarSize / 2);
      return [size, size];
    },
    polarScale () {
      if (this.polarCurve === null) {
        return 0;
      }
      return this.polarSize / this.polarHeadroom / this.polarCurve.maxspeed.speed;
    },
    polarCurve () {
      if (this.useCurrentCurve) {
        return this.currentCurve;
      }
      if (!this.tws) {
        return null;
      }
      return this.$store.getters['boat/polar/curve'](this.tws);
    },
    needsRedraw () {
      if (this.showPolar) {
        this.polarCurve;
        this.polarScale;
        this.twd;
      }
      return Date.now();
    },
    ...mapState({
      mapSize: state => state.map.size,
    }),
    ...mapGetters({
      currentCurve: 'boat/polar/currentCurve',
    }),
  },

  methods: {
    draw (ctx) {
      if (!this.showPolar || (this.polarCurve === null)) {
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
