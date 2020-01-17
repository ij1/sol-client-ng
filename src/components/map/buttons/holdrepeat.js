import { eventMap } from '../../../lib/events.js';

export let holdRepeatMixin = {
  data () {
    return {
      holdRepeatEv: null,
    }
  },
  methods: {
    holdRepeatOnRepeat () {
      if (this.holdRepeatEv !== null) {
        this.$emit('holdrepeat', this.holdRepeatEv);
      }
    },
    holdRepeatStart (e) {
      this.holdRepeatEv = e;
      this.map.on('zoomend', this.holdRepeatOnRepeat);
      window.addEventListener(eventMap[this.holdRepeatEv.type].end,
                              this.holdRepeatStop);
    },
    holdRepeatStop () {
      this.map.off('zoomend', this.holdRepeatOnRepeat);
      window.removeEventListener(eventMap[this.holdRepeatEv.type].end,
                                 this.holdRepeatStop);
      this.holdRepeatEv = null;
    },
  },
  mounted () {
  },
  beforeDestroy () {
    if (this.holdRepeatEv !== null) {
      this.holdRepeatStop();
    }
  },
}
