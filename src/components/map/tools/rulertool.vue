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
      uiModeHandlingDblClicks: true,
    }
  },
  computed: {
    pendingPosition: {
      get () {
        return this.rulerPendingPosition;
      },
      set (value) {
        this.$store.commit('ui/ruler/setPendingPosition', value);
      }
    },
    aimSegment () {
      if ((this.pendingPosition === null) ||
          (this.hoverLatLng === null) ||
          this.pendingPosition.equals(this.hoverLatLng)) {
        return null;
      }
      let segment = loxoCalc(this.pendingPosition, this.hoverLatLng);
      segment.line = [this.pendingPosition, this.hoverLatLng];
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
      rulerPendingPosition: state => state.ui.ruler.rulerPendingPosition,
    }),
  },
  methods: {
    addSegment (latLng) {
      if (this.pendingPosition.equals(latLng)) {
        return;
      }
      let newSegment = loxoCalc(this.pendingPosition, latLng);
      const wrappedPos = this.pendingPosition.wrap();
      const wrappedDst = L.latLng(latLng.lat,
                                  latLng.lng + (wrappedPos.lng - this.pendingPosition.lng));
      newSegment.line = [wrappedPos, wrappedDst];
      this.$store.commit('ui/ruler/newSegment', newSegment);
      this.pendingPosition = latLng;
    },
    onSingleClick (e) {
      const latLng = e.latlng;
      if (this.pendingPosition === null) {
        this.pendingPosition = latLng;
      } else {
        this.addSegment(latLng);
      }
    },
    onDoubleClick () {
      this.$store.dispatch('ui/cancelUiMode');
    },
    onCancel () {
      if ((this.pendingPosition !== null) &&
          (this.lastFixedSegment !== null)) {
        if (this.pendingPosition.equals(this.lastFixedSegment.line[1])) {
          this.pendingPosition = this.lastFixedSegment.line[0];
        } else {
          this.pendingPosition = null;
          return;
        }
      } else {
        this.pendingPosition = null;
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
    this.pendingPosition = null;
    window.removeEventListener('keyup', this.onCancelKey);
    this.$off('doubleclick', this.onDoubleClick);
    this.$off('singleclick-early', this.onSingleClick);
  },
}
</script>
