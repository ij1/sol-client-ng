export let holdRepeatMixin = {
  data () {
    return {
      holdRepeatEv: null,
    }
  },
  methods: {
    holdRepeatOnRepeat () {
      if (this.holdRepeatEv !== null) {
        this.$emit('clickrepeat', this.holdRepeatEv);
      }
    },
    holdRepeatStart (e) {
      this.holdRepeatEv = e;
      this.map.on('zoomend', this.holdRepeatOnRepeat);
      window.addEventListener('mouseup', this.holdRepeatStop);
    },
    holdRepeatStop () {
      this.holdRepeatEv = null;
      this.map.off('zoomend', this.holdRepeatOnRepeat);
      window.removeEventListener('mouseup', this.holdRepeatStop);
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
