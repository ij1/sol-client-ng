<template>
  <l-control
    :position = "'topleft'"
  >
    <div
       id = "zoom-button"
       class = "tool-button"
       ref = "zoom-in-button"
       @mousedown.prevent = "onClick"
    >
      +
    </div>
  </l-control>
</template>

<script>
import L from 'leaflet';
import { LControl } from 'vue2-leaflet';
import { mouseDownRepeatMixin } from './mousedownrepeat.js';
import { OLD_CLIENT_MAXZOOM } from '../../../lib/sol.js';

export default {
  name: 'ZoomInButton',
  mixins: [ mouseDownRepeatMixin ],
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
        this.mouseDownRepeatOnMouseDown();
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
    L.DomEvent.disableClickPropagation(this.$refs['zoom-in-button']);
    this.$on('clickrepeat', this.onRepeat);
  },
  beforeDestroy () {
    this.$off('clickrepeat', this.onRepeat);
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
