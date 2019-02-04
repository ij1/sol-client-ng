<template>
  <l-control
    id = "center-boat"
    :position = "'topleft'"
  >
    <div ref = "center-boat-button" @click = "onClick">
      CenterBoat
    </div>
  </l-control>
</template>

<script>
import L from 'leaflet';
import { mapState } from 'vuex';
import { EventBus } from '../../lib/event-bus.js';
import { LControl } from 'vue2-leaflet'

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
