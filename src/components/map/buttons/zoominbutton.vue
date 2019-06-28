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
import { mapState } from 'vuex';
import L from 'leaflet';
import { LControl } from 'vue2-leaflet';

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
  computed: {
    ...mapState({
      maxZoom: state => state.map.maxZoom,
    }),
  },
  methods: {
    onClick (ev) {
      if (!ev.altKey) {
        this.map.zoomIn();
      } else {
        this.map.flyTo(this.map.getCenter(), this.maxZoom);
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
