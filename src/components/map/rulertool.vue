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
  data () {
    return {
      lastPosition: null,
      dblClickTimer: null,
      dblClickInterval: 200,
    }
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
      hoverLatLng: state => state.map.hoverLatLng,
    }),
  },
  methods: {
    addSegment (latLng) {
      if (this.lastPosition.equals(latLng)) {
        return;
      }
      let newSegment = loxoCalc(this.lastPosition, latLng);
      newSegment.line = [this.lastPosition, latLng];
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
    cancelEvents() {
      this.map.off('click', this.onClick, this);
      if (this.dblClickTimer !== null) {
        clearTimeout(this.dblClickTimer);
        this.dblClickTimer = null;
      }
    },
  },
  mounted () {
    this.map.on('click', this.onClick, this);
  },
  beforeDestroy () {
    this.cancelEvents();
  },
}
</script>
