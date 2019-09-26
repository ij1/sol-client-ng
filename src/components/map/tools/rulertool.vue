<template>
  <!-- HACK: in order to get tooltip to update, put Date.now() to key to
       force recalculation, it will probably be annoying from GC PoV though
    -->
  <ruler-segment
    v-if = "aimSegment !== null"
    :key = "Date.now()"
    :segment = "aimSegment"
    :index = "null"
    :color = "'#333'"
    :world-copy-wrap = "false"
  />
</template>

<script>
import { mapState, mapGetters } from 'vuex';
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
    aimSegment () {
      if (this.pendingPosition === null) {
        return null;
      }
      let target = this.hoverLatLng;
      if (target === null) {
        /* Create zero line */
        target = this.pendingPosition;
      }
      let segment = loxoCalc(this.pendingPosition, target);
      segment.line = [this.pendingPosition, target];
      segment.wrappedLine = [this.wrappedPendingPosition, target.wrap()];
      segment.totalDistance = segment.distance;
      if (this.extendingPath) {
        segment.totalDistance += this.lastSegment.totalDistance;
      }
      return segment;
    },
    ...mapState({
      hoverLatLng: state => state.map.hoverLatLng,
      rulerSegments: state => state.ui.ruler.rulerSegments,
      pendingPosition: state => state.ui.ruler.rulerPendingPosition,
    }),
    ...mapGetters({
      wrappedPendingPosition: 'ui/ruler/wrappedPendingPosition',
      lastSegment: 'ui/ruler/lastSegment',
      extendingPath: 'ui/ruler/extendingPath',
    }),
  },
  methods: {
    addSegment (latLng) {
      let newSegment = loxoCalc(this.pendingPosition, latLng);
      /* Wraps start pos and adjust destination by the same amount */
      const wrappedDst = L.latLng(latLng.lat,
                                  latLng.lng + (this.wrappedPendingPosition.lng - this.pendingPosition.lng));
      newSegment.line = [this.wrappedPendingPosition, wrappedDst];
      /* Fully wrap the destination here */
      newSegment.wrappedLine = [this.wrappedPendingPosition.wrap(),
                                wrappedDst.wrap()];
      newSegment.totalDistance = newSegment.distance;
      if (this.extendingPath) {
        newSegment.totalDistance += this.lastSegment.totalDistance;
      }

      this.$store.commit('ui/ruler/newSegment', newSegment);
    },
    onSingleClick (e) {
      const latLng = e.latlng;
      if (this.pendingPosition !== null) {
        if (this.pendingPosition.equals(latLng)) {
          return;
        }
        this.addSegment(latLng);
      }
      this.$store.commit('ui/ruler/setPendingPosition', latLng);
    },
    onDoubleClick () {
      this.$store.dispatch('ui/cancelUiMode');
    },
    onCancel () {
      this.$store.commit('ui/ruler/delSegment');
    },
    onCancelKey (e) {
      if (e.which === 8) {
        if (this.hoverLatLng !== null) {
          e.preventDefault();
          this.onCancel();
        }
      }
    },
  },
  mounted () {
    window.addEventListener('keydown', this.onCancelKey);
    this.$on('doubleclick', this.onDoubleClick);
    this.$on('singleclick-early', this.onSingleClick);
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.onCancelKey);
    this.$off('doubleclick', this.onDoubleClick);
    this.$off('singleclick-early', this.onSingleClick);
  },
}
</script>
