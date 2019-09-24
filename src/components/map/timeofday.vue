<template>
  <l-layer-group v-if = "boatId !== null">
    <l-terminator
      :stroke = "false"
      :fill-color = "'#000'"
      :fill-opacity = "0.1"
      :time = "boatTime"
      pane = "timeofdayPane"
    />
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup } from 'vue2-leaflet';
import Vue2LeafletTerminator from './Vue2LeafletTerminator.vue';

export default {
  name: 'TimeOfDay',
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  components: {
    'l-layer-group': LLayerGroup,
    'l-terminator': Vue2LeafletTerminator,
  },
  computed: {
    ...mapState({
      boatId: state => state.boat.id,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
    }),
  },
  created () {
    let pane = this.map.createPane('timeofdayPane');
    pane.style.zIndex = 300;
  },
}
</script>
