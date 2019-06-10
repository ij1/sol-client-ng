<template>
  <!-- HACK: in order to get tooltip to update, put Date.now() to key to
       force recalculation, it will probably be annoying from GC PoV though
    -->
  <ruler-segment
    v-if = "aimSegment !== null"
    :key = "Date.now()"
    :segment = "aimSegment"
    :color = "'#333'"
  />
</template>

<script>
import { mapState } from 'vuex';
import { loxoCalc } from '../../lib/nav.js';
import RulerSegment from './rulersegment.vue';

export default {
  name: 'RulerTool',
  components: {
    'ruler-segment': RulerSegment,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  computed: {
    aimSegment () {
      if ((this.lastPosition === null) || (this.hoverLatLng === null)) {
        return null;
      }
      let segment = loxoCalc(this.lastPosition, this.hoverLatLng);
      segment.line = [this.lastPosition, this.hoverLatLng];
      return segment;
    },
    ...mapState({
      lastPosition: state => state.ui.ruler.lastPosition,
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
