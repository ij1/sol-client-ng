<template>
  <l-control
    id = "center-boat"
    :position = "'topleft'"
  >
    <div @click = "onClick">
      CenterBoat
    </div>
  </l-control>
</template>

<script>
import { EventBus } from '../../lib/event-bus.js';
import { LControl } from 'vue2-leaflet'

export default {
  name: 'CenterBoat',
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
    onClick () {
      if (this.$store.state.boat.position) {
        EventBus.$emit('map-highlight', {
          latLng: this.$store.state.boat.position,
          keepMapPosition: false,
        });
      }
    },
  },
}
</script>
