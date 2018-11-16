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

  data () {
    return {
      initialRadius: 100,
      interval: 10,
      latLng: null,
      startTimestamp: -1000,
      nowTimestamp: 0,
      timer: null,
    }
  },

  computed: {
    radius () {
      let r = this.initialRadius - (this.nowTimestamp - this.startTimestamp) / this.interval;
      r = Math.round(r);
      console.log("Recalc radius: " + r);
      return r > 0 ? r : 0;
    },
  },

  methods: {
    updateNow () {
      this.nowTimestamp = Date.now();
      if (this.radius <= 0) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    onHighlight (latLng) {
      this.latLng = latLng;
      this.startTimestamp = Date.now();
      this.nowTimestamp = this.startTimestamp;
      this.timer = setInterval(this.updateNow.bind(this), this.interval);
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
