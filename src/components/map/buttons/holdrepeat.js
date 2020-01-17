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
    },
    holdRepeatStop () {
      this.holdRepeatEv = null;
      this.map.off('zoomend', this.holdRepeatOnRepeat);
    },
  },
  mounted () {
    window.addEventListener('mouseup', this.holdRepeatStop);
  },
  beforeDestroy () {
    window.removeEventListener('mouseup', this.holdRepeatStop);
    if (this.holdRepeatEv !== null) {
      this.map.off('zoomend', this.holdRepeatOnRepeat);
    }
  },
}
