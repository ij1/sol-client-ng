<template>
  <l-control
    :position = "'topleft'"
  >
    <div
       id = "zoom-button"
       class = "tool-button"
       ref = "zoom-out-button"
       @mousedown.prevent = "onClick"
    >
      &#x2013;
    </div>
  </l-control>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { mouseDownRepeatMixin } from './mousedownrepeat.js';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'ZoomOutButton',
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
  computed: {
    ...mapState({
      minZoom: state => state.map.minZoom,
    }),
  },
  methods: {
    onClick (ev) {
      if (!ev.altKey) {
        this.map.zoomOut();
        this.mouseDownRepeatOnMouseDown();
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
