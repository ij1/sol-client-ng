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
import { loxoCalc } from '../../lib/nav.js';
import RulerSegment from './rulersegment.vue';

export default {
  name: 'MapRuler', 
  components: {
    'l-layer-group': LLayerGroup,
    'ruler-segment': RulerSegment,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  computed: {
    target () {
      return (this.hoverLatLng !== null) ? this.hoverLatLng : this.visualPosition;
    },
    rulerLine () {
      return [this.lastPosition, this.target];
    },
    ...mapState({
      lastPosition: state => state.ui.ruler.lastPosition,
      rulerSegments: state => state.ui.ruler.rulerSegments,
      hoverLatLng: state => state.map.hoverLatLng,
    }),
  },
  methods: {
    onClick (e) {
      if (this.lastPosition === null) {
        this.$store.commit('ui/ruler/newPath', e.latlng);
      } else {
        let newSegment = loxoCalc(this.lastPosition, e.latlng);
        newSegment.line = [this.lastPosition, e.latlng];
        this.$store.commit('ui/ruler/extendPath', newSegment);
      }
    },
    onDblClick (e) {
      this.onClick(e);
      this.cancelEvents();
      this.$store.dispatch('ui/cancelUiMode');
    },
    cancelEvents() {
      this.map.off('dblclick', this.onDblClick, this);
      this.map.off('click', this.onClick, this);
    },
  },
  mounted () {
    this.map.on('click', this.onClick, this);
    this.map.on('dblclick', this.onDblClick, this);
  },
  beforeDestroy () {
    this.cancelEvents();
  },
}
</script>
