<template>
  <l-control
    id = "center-boat"
    :position = "'topleft'"
  >
    <div
      class = "tool-button"
      ref = "center-boat-button"
      @click.stop.prevent = "onClick"
      @touchstart.stop.prevent = "onClick"
      @touchend.stop.prevent
    >
      Center<br>Boat
    </div>
  </l-control>
</template>

<script>
import L from 'leaflet';
import { mapState } from 'vuex';
import { EventBus } from '../../../lib/event-bus.js';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'CenterBoat',
  components: {
    'l-control': LControl,
  },
  computed: {
    ...mapState({
      boatPosition: state => state.boat.position,
    }),
  },
  methods: {
    onClick () {
      if (this.boatPosition) {
        EventBus.$emit('map-highlight', {
          latLng: this.boatPosition,
          keepMapPosition: false,
        });
      }
    },
  },
 mounted () {
   L.DomEvent.disableClickPropagation(this.$refs['center-boat-button']);
 },
}
</script>
