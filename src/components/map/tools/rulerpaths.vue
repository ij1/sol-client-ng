<template>
  <l-layer-group>
    <ruler-segment
      v-for = "(segment, index) in rulerSegments"
      :key = "segment.id"
      :segment = "segment"
      :index = "index"
      :color = "color"
    />
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup } from 'vue2-leaflet';
import RulerSegment from './rulersegment.vue';

export default {
  name: 'RulerPaths', 
  components: {
    'l-layer-group': LLayerGroup,
    'ruler-segment': RulerSegment,
  },
  computed: {
    color () {
      return this.currentDayNight === 'white' ? '#000' : '#0f0';
    },
    ...mapState({
      rulerSegments: state => state.ui.ruler.rulerSegments,
    }),
    ...mapGetters({
      currentDayNight: 'ui/currentDayNight',
    }),
  },
}
</script>
