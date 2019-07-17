export let uiModeMixin = {
  props: {
    map: Object,
    required: true,
  },
  data () {
    return {
      dblClickTimer: null,
      dblClickInterval: 200,
      uiModeHandlingDblClicks: false,
    }
  },
  methods: {
    uiModeOnKey (e) {
      if (e.which === 27) {
        this.$store.dispatch('ui/cancelUiMode');
        return;
      }
    },
    uiModeOnCommitClick (e) {
      this.$emit('singleclick-committed', e);
      this.dblClickTimer = null;
    },
    uiModeOnClick (e) {
      if (this.uiModeHandlingDblClicks) {
        if (this.dblClickTimer !== null) {
          this.uiModeCancelDblClickTimer();
          this.$emit('doubleclick', e);
        } else {
          this.$emit('singleclick-early', e);
          this.dblClickTimer = setTimeout(this.uiModeOnCommitClick,
                                          this.dblClickInterval, e);
        }
      } else {
        this.$emit('singleclick-committed', e);
      }
    },
    uiModeCancelDblClickTimer () {
      clearTimeout(this.dblClickTimer);
      this.dblClickTimer = null;
    },
  },
  mounted () {
    this.map.on('mousedown', this.uiModeOnClick, this);
    window.addEventListener('keyup', this.uiModeOnKey);
  },
  beforeDestroy () {
    window.removeEventListener('keyup', this.uiModeOnKey);
    this.map.off('mousedown', this.uiModeOnClick, this);
    if (this.dblClickTimer !== null) {
      this.uiModeCancelDblClickTimer();
    }
  },
}
