<template>
  <l-control
    :position = "'topleft'"
  >
    <div
       id = "zoom-button"
       class = "tool-button"
       ref = "zoom-out-button"
       @mousedown.stop.prevent = "onClick"
       @touchstart.stop.prevent = "onClick"
       @touchend.stop.prevent = "holdRepeatStop"
    >
      &#x2013;
    </div>
  </l-control>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
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
      zoomStep: state => state.map.zoomStep,
    }),
    ...mapGetters({
      raceBounds: 'race/raceBounds',
    }),
  },
  methods: {
    onClick (ev) {
      if (!ev.altKey) {
        this.holdRepeatStart(ev);
        this.map.zoomOut();
      } else {
        const bounds = this.raceBounds.extend(this.map.getCenter()).pad(0.3);

        const zoom = this.map.getZoom();
        const minZoom = Math.min(zoom, 12);

        const zoomCandidate = this.map.getBoundsZoom(bounds);
        if (zoomCandidate < zoom - this.zoomStep) {
          this.map.flyToBounds(bounds, { maxZoom: minZoom });
        }
      }
    },
    onRepeat () {
      this.map.zoomOut(0.6);
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
