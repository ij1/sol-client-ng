<template>
  <l-layer-group>
    <l-circle-marker
      v-if = "this.latLng !== null && this.radius > 0"
      :latLng = "latLng"
      :radius = "radius"
      color = "#c000c0"
      :weight = "1"
      :fill = "false"
    />
  </l-layer-group>
</template>

<script>
import { EventBus } from '../../lib/event-bus.js';
import { LLayerGroup, LCircleMarker } from 'vue2-leaflet';

export default {
  name: 'MapHighlight',
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle-marker': LCircleMarker,
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
      latLng: null,
      startTimestamp: -1000,		/* -(100 * 10) */
      nowTimestamp: 0,
      timer: null,
    }
  },

  computed: {
    radius () {
      let r = this.initialRadius - (this.nowTimestamp - this.startTimestamp) / this.interval;
      r = Math.round(r);
      return r > 0 ? r : 0;
    },
  },

  methods: {
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
    onHighlight (latLng) {
      /* This is bit tricky, remove prev/stale highlight first.
       * Only at the nextTick, launch the next highlight to avoid first
       * displaying at the wrong position.
       */
      this.cancelHighlight();
      this.latLng = latLng;
      this.$nextTick(() => {
        this.startTimestamp = Date.now();
        this.nowTimestamp = this.startTimestamp;
        this.timer = setInterval(this.updateNow.bind(this), this.interval);

        this.map.flyTo(this.latLng);
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
