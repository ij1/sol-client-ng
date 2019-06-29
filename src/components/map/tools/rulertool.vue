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
  data () {
    return {
      lastPosition: null,
      dblClickTimer: null,
      dblClickInterval: 200,
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
    onClick (e) {
      if (this.dblClickTimer !== null) {
        this.onDoubleClick(e.latlng);
      } else {
        this.dblClickTimer = setTimeout(this.onSingleClick,
                                        this.dblClickInterval,
                                        e.latlng);
      }
    },
    onSingleClick (latLng) {
      if (this.lastPosition === null) {
        this.lastPosition = latLng;
      } else {
        this.addSegment(latLng);
      }
      this.dblClickTimer = null;
    },
    onDoubleClick (latLng) {
      if (this.lastPosition !== null) {
        this.addSegment(latLng);
      }
      this.cancelEvents();
      this.$store.dispatch('ui/cancelUiMode');
    },
    onCancelKey (e) {
      if (e.which === 27 || e.which === 8) {
        if (this.dblClickTimer !== null) {
          clearTimeout(this.dblClickTimer);
          this.dblClickTimer = null;
          return;
        } else if ((this.lastPosition !== null) &&
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
      }
    },
    cancelEvents() {
      window.removeEventListener('keyup', this.onCancelKey);
      this.map.off('click', this.onClick, this);
      if (this.dblClickTimer !== null) {
        clearTimeout(this.dblClickTimer);
        this.dblClickTimer = null;
      }
    },
  },
  mounted () {
    this.map.on('click', this.onClick, this);
    window.addEventListener('keyup', this.onCancelKey);
  },
  beforeDestroy () {
    this.cancelEvents();
  },
}
</script>
