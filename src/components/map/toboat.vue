<template>
  <l-control
    id = "to-my-boat"
    :position = "'topleft'"
  >
    <div @click = "onClick">
      ToMyBoat
    </div>
  </l-control>
</template>

<script>
import { EventBus } from '../../lib/event-bus.js';
import { LControl } from 'vue2-leaflet'

export default {
  name: 'ToBoat',
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
        EventBus.$emit('map-highlight', this.$store.state.boat.position);
      }
    },
  },
}
</script>
