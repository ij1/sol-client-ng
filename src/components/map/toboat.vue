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
        this.map.panTo(this.$store.state.boat.position);
        // ADDME: circle highlight at the boat position, perhaps emit it?
      }
    },
  },
}
</script>
