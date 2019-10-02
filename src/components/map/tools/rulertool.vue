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
import { gcCalc, loxoCalc } from '../../../lib/nav.js';
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
      return this.calculateSegment(target, false);
    },
    ...mapState({
      hoverLatLng: state => state.map.hoverLatLng,
      rulerSegments: state => state.ui.ruler.rulerSegments,
      pendingPosition: state => state.ui.ruler.rulerPendingPosition,
      cfgGcMode: state => state.ui.cfg.gcMode.value,
      mapCenter: state => state.map.center,
    }),
    ...mapGetters({
      wrappedPendingPosition: 'ui/ruler/wrappedPendingPosition',
      lastSegment: 'ui/ruler/lastSegment',
      extendingPath: 'ui/ruler/extendingPath',
    }),
  },
  methods: {
    calculateSegment (latLng, wrap) {
      let target = latLng;
      const lngDiff = target.lng - this.pendingPosition.lng;
      /* Truncate to 179 degrees to avoid UI inconsistencies */
      if (lngDiff > 179) {
        target = L.latLng(target.lat, this.pendingPosition.lng + 179);
      } else if (lngDiff < -179) {
        target = L.latLng(target.lat, this.pendingPosition.lng - 179);
      }
      let newSegment;
      if (this.cfgGcMode) {
        newSegment = gcCalc(this.pendingPosition, target);
      } else {
        newSegment = loxoCalc(this.pendingPosition, target);
      }
      let lineDst;
      if (wrap) {
        /* Wraps start pos and adjust destination by the same amount */
        let wrappedLng = target.lng +
                         (this.wrappedPendingPosition.lng - this.pendingPosition.lng);
        lineDst = L.latLng(target.lat, wrappedLng);
        newSegment.line = [this.wrappedPendingPosition, lineDst];
      } else {
        lineDst = target;
        newSegment.line = [this.pendingPosition, lineDst];
      }
      /* Fully wrap the destination here */
      newSegment.wrappedLine = [this.wrappedPendingPosition, lineDst.wrap()];
      newSegment.totalDistance = newSegment.distance;
      if (this.extendingPath) {
        newSegment.totalDistance += this.lastSegment.totalDistance;
      }
      return newSegment;
    },
    addSegment (latLng) {
      this.$store.commit('ui/ruler/newSegment',
                         this.calculateSegment(latLng, true));
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
  watch: {
    mapCenter (newVal, oldVal) {
      if ((this.pendingPosition === null) ||
          (Math.sign(oldVal.lng) === Math.sign(newVal.lng)) ||
          (Math.abs(oldVal.lng) < 90) ||
          (Math.abs(newVal.lng) < 90)) {
        return;
      }
      const diff = newVal.lng - oldVal.lng;
      const adjust = Math.sign(diff) * Math.ceil(Math.abs(diff) / 360) * 360;
      const newPos = L.latLng(this.pendingPosition.lat,
                              this.pendingPosition.lng + adjust);
      this.$store.commit('ui/ruler/setPendingPosition', newPos);
    }
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
