export let mouseDownRepeatMixin = {
  data () {
    return {
      mouseDownRepeatEv: null,
    }
  },
  methods: {
    mouseDownRepeatOnRepeat () {
      if (this.mouseDownRepeatEv !== null) {
        this.$emit('clickrepeat', this.mouseDownRepeatEv);
      }
    },
    mouseDownRepeatOnMouseDown (e) {
      this.mouseDownRepeatEv = e;
      this.map.on('zoomend', this.mouseDownRepeatOnRepeat);
    },
    mouseDownRepeatOnMouseUp () {
      this.mouseDownRepeatEv = null;
      this.map.off('zoomend', this.mouseDownRepeatOnRepeat);
    },
  },
  mounted () {
    window.addEventListener('mouseup', this.mouseDownRepeatOnMouseUp);
  },
  beforeDestroy () {
    window.removeEventListener('mouseup', this.mouseDownRepeatOnMouseUp);
    if (this.mouseDownRepeatEv !== null) {
      this.map.off('zoomend', this.mouseDownRepeatOnRepeat);
    }
  },
}
