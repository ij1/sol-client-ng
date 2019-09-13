<template>
  <!-- HACK: in order to get tooltip to update, put Date.now() to key to
       force recalculation, it will probably be annoying from GC PoV though
    -->
  <ruler-segment
    v-if = "aimSegment !== null"
    :key = "Date.now()"
    :segment = "aimSegment"
    :color = "'#333'"
    :world-copy-wrap = "false"
  />
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { loxoCalc } from '../../../lib/nav.js';
import RulerSegment from './rulersegment.vue';
import { uiModeMixin } from '../../mixins/uimode.js';

export default {
  name: 'RulerTool',
  components: {
    'ruler-segment': RulerSegment,
  },
  mixins: [uiModeMixin],
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      lastPosition: null,
      uiModeHandlingDblClicks: true,
    }
  },
  computed: {
    aimSegment () {
      if ((this.lastPosition === null) ||
          (this.hoverLatLng === null) ||
          this.lastPosition.equals(this.hoverLatLng)) {
        return null;
      }
      let segment = loxoCalc(this.lastPosition, this.hoverLatLng);
      segment.line = [this.lastPosition, this.hoverLatLng];
      return segment;
    },
    lastFixedSegment () {
      if (this.rulerSegments.length === 0) {
        return null;
      }
      return this.rulerSegments[this.rulerSegments.length - 1];
    },
    ...mapState({
      hoverLatLng: state => state.map.hoverLatLng,
      rulerSegments: state => state.ui.ruler.rulerSegments,
    }),
  },
  methods: {
    addSegment (latLng) {
      if (this.lastPosition.equals(latLng)) {
        return;
      }
      let newSegment = loxoCalc(this.lastPosition, latLng);
      const wrappedPos = this.lastPosition.wrap();
      const wrappedDst = L.latLng(latLng.lat,
                                  latLng.lng + (wrappedPos.lng - this.lastPosition.lng));
      newSegment.line = [wrappedPos, wrappedDst];
      this.$store.commit('ui/ruler/newSegment', newSegment);
      this.lastPosition = latLng;
    },
    onSingleClick (e) {
      const latLng = e.latlng;
      if (this.lastPosition === null) {
        this.lastPosition = latLng;
      } else {
        this.addSegment(latLng);
      }
    },
    onDoubleClick () {
      this.$store.dispatch('ui/cancelUiMode');
    },
    onCancel () {
      if ((this.lastPosition !== null) &&
          (this.lastFixedSegment !== null)) {
        if (this.lastPosition.equals(this.lastFixedSegment.line[1])) {
          this.lastPosition = this.lastFixedSegment.line[0];
        } else {
          this.lastPosition = null;
          return;
        }
      } else {
        this.lastPosition = null;
      }
      this.$store.commit('ui/ruler/delSegment');
    },
    onCancelKey (e) {
      if (e.which === 8) {
        e.preventDefault();
        this.onCancel();
      }
    },
  },
  mounted () {
    window.addEventListener('keyup', this.onCancelKey);
    this.$on('doubleclick', this.onDoubleClick);
    this.$on('singleclick-early', this.onSingleClick);
  },
  beforeDestroy () {
    window.removeEventListener('keyup', this.onCancelKey);
    this.$off('doubleclick', this.onDoubleClick);
    this.$off('singleclick-early', this.onSingleClick);
  },
}
</script>
