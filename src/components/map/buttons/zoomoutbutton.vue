<template>
  <l-control
    :position = "'topleft'"
  >
    <div
       id = "zoom-button"
       class = "tool-button"
       ref = "zoom-out-button"
       @click.prevent = "onClick"
    >
      &#x2013;
    </div>
  </l-control>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'ZoomOutButton',
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
      } else {
        this.map.flyTo(this.map.getCenter(), this.minZoom);
      }
    },
  },
 mounted () {
   L.DomEvent.disableClickPropagation(this.$refs['zoom-out-button']);
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
