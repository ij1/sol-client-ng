<template>
  <div/>
</template>

<script>
import { mapGetters } from 'vuex';
import { uiModeMixin } from '../mixins/uimode.js';

export default {
  name: 'DefaultUiMode',
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
    ...mapGetters({
      inDefaultUiMode: 'ui/inDefaultUiMode',
    }),
  },
  methods: {
    onDoubleClick (e) {
      if (this.inDefaultUiMode) {
        this.map.panTo(e.latlng);
      }
    },
    onSingleClick (e) {
      if (e.originalEvent.altKey) {
        this.$store.commit('ui/poi/newPoi', {
          latLng: e.latlng.wrap(),
        });
      }
    },
  },
  mounted () {
    this.$on('doubleclick', this.onDoubleClick);
    this.$on('singleclick-committed', this.onSingleClick);
  },
  beforeDestroy () {
    this.$off('doubleclick', this.onDoubleClick);
    this.$off('singleclick-commited', this.onSingleClick);
  },
}
</script>
