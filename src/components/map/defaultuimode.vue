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
  },
  mounted () {
    this.$on('doubleclick', this.onDoubleClick);
  },
  beforeDestroy () {
    this.$off('doubleclick', this.onDoubleClick);
  },
}
</script>
