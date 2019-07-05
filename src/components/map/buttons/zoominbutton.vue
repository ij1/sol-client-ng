<template>
  <l-control
    :position = "'topleft'"
  >
    <div
       id = "zoom-button"
       class = "tool-button"
       ref = "zoom-in-button"
       @click.prevent = "onClick"
    >
      +
    </div>
  </l-control>
</template>

<script>
import L from 'leaflet';
import { LControl } from 'vue2-leaflet';
import { OLD_CLIENT_MAXZOOM } from '../../../lib/sol.js';

export default {
  name: 'ZoomInButton',
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
        this.map.zoomIn();
      } else {
        this.map.flyTo(this.map.getCenter(), OLD_CLIENT_MAXZOOM);
      }
    },
  },
 mounted () {
   L.DomEvent.disableClickPropagation(this.$refs['zoom-in-button']);
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
