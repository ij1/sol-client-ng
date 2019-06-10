<template>
  <l-layer-group>
    <ruler-segment
      v-for = "segment in rulerSegments"
      :key = "segment.id"
      :segment = "segment"
      :color = "'#000'"
    />
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup } from 'vue2-leaflet';
import RulerSegment from './rulersegment.vue';

export default {
  name: 'RulerPaths', 
  components: {
    'l-layer-group': LLayerGroup,
    'ruler-segment': RulerSegment,
  },
  computed: {
    ...mapState({
      rulerSegments: state => state.ui.ruler.rulerSegments,
    }),
  },
}
</script>
