<template>
  <l-control
    :position = "'topleft'"
  >
    <div
       id = "zoom-button"
       class = "tool-button"
       ref = "zoom-out-button"
       @mousedown.prevent = "onClick"
       @touchstart.prevent = "onClick"
       @touchend.prevent = "holdRepeatStop"
    >
      &#x2013;
    </div>
  </l-control>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { holdRepeatMixin } from './holdrepeat.js';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'ZoomOutButton',
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
  computed: {
    ...mapState({
      minZoom: state => state.map.minZoom,
    }),
  },
  methods: {
    onClick (ev) {
      if (!ev.altKey) {
        this.holdRepeatStart(ev);
        this.map.zoomOut();
      } else {
        this.map.flyTo(this.map.getCenter(), this.minZoom);
      }
    },
    onRepeat () {
      this.map.zoomOut(0.6);
    },
  },
  mounted () {
    L.DomEvent.disableClickPropagation(this.$refs['zoom-out-button']);
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
