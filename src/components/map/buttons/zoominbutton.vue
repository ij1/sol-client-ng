<template>
  <l-control
    :position = "'topleft'"
  >
    <div
       id = "zoom-button"
       class = "tool-button"
       ref = "zoom-in-button"
       @mousedown.stop.prevent = "onClick"
       @touchstart.stop.prevent = "onClick"
       @touchend.stop.prevent = "holdRepeatStop"
    >
      +
    </div>
  </l-control>
</template>

<script>
import { LControl } from 'vue2-leaflet';
import { holdRepeatMixin } from './holdrepeat.js';
import { OLD_CLIENT_MAXZOOM } from '../../../lib/sol.js';

export default {
  name: 'ZoomInButton',
  mixins: [ holdRepeatMixin ],
  components: {
    'l-control': LControl,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  methods: {
    onClick (ev) {
      if (!ev.altKey) {
        this.holdRepeatStart(ev);
        this.map.zoomIn();
      } else {
        this.map.flyTo(this.map.getCenter(), OLD_CLIENT_MAXZOOM);
      }
    },
    onRepeat () {
      this.map.zoomIn(0.6);
    },
  },
  mounted () {
    this.$on('holdrepeat', this.onRepeat);
  },
  beforeDestroy () {
    this.$off('holdrepeat', this.onRepeat);
  },
}
</script>

<style scoped>
#zoom-button {
  padding: 0px;
  width: 35px;
  height: 35px;
  font-size: 24px;
}
</style>
