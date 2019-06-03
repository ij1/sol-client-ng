<template>
  <marker-canvas
    @draw = "draw"
    :lat-lng = "latLng"
    :icon-center = "highlightCenter"
    :needs-redraw = "radius"
  />
</template>

<script>
import { EventBus } from '../../lib/event-bus.js';
import MarkerCanvas from './markercanvas.vue';
import L from 'leaflet';
import { degToRad, radToDeg } from '../../lib/utils.js';
import { minTurnAngle } from '../../lib/nav.js';

export default {
  name: 'MapHighlight',
  components: {
    'marker-canvas': MarkerCanvas,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      initialRadius: 100,
      interval: 10,
      latLng: L.latLng(0, 0),
      startTimestamp: -1000,		/* -(100 * 10) */
      nowTimestamp: 0,
      timer: null,
    }
  },

  computed: {
    highlightCenter () {
      return [this.initialRadius, this.initialRadius];
    },
    radius () {
      let r = this.initialRadius - (this.nowTimestamp - this.startTimestamp) / this.interval;
      r = Math.round(r);
      return r > 0 ? r : 0;
    },
  },

  methods: {
    draw (ctx) {
      if (this.radius === 0) {
        return;
      }
      ctx.strokeStyle = "#c000c0";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
    },
    updateNow () {
      this.nowTimestamp = Date.now();
      if (this.radius <= 0) {
        this.cancelHighlight();
      }
    },
    cancelHighlight () {
      this.startTimestamp = -(this.initialRadius * this.interval);
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    onHighlight (highlightInfo) {
      /* This is bit tricky, remove prev/stale highlight first.
       * Only at the nextTick, launch the next highlight to avoid first
       * displaying at the wrong position.
       */
      this.cancelHighlight();
      this.latLng = highlightInfo.latLng;
      this.$nextTick(() => {
        this.startTimestamp = Date.now();
        this.nowTimestamp = this.startTimestamp;
        this.timer = setInterval(this.updateNow.bind(this), this.interval);

        const currentLatLng = this.map.getCenter();
        const minTurn = minTurnAngle(degToRad(currentLatLng.lng),
                                     degToRad(this.latLng.lng));
        const targetLatLng = L.latLng(this.latLng.lat,
                                      currentLatLng.lng + radToDeg(minTurn));
        if (!highlightInfo.keepMapPosition) {
          this.map.flyTo(targetLatLng);
        }
      });

    },
  },

  mounted () {
    EventBus.$on('map-highlight', this.onHighlight);
  },
  beforeDestroy () {
    EventBus.$off('map-highlight', this.onHighlight);
  },
}
</script>
