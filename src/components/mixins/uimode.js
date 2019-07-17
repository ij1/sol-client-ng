export let uiModeMixin = {
  props: {
    map: Object,
    required: true,
  },
  data () {
    return {
      uiModeData: {
        dblClickTimer: null,
        dblClickInterval: 200,
      },
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
      this.uiModeData.dblClickTimer = null;
    },
    uiModeOnClick (e) {
      if (this.uiModeHandlingDblClicks) {
        if (this.uiModeData.dblClickTimer !== null) {
          this.uiModeCancelDblClickTimer();
          this.$emit('doubleclick', e);
        } else {
          this.$emit('singleclick-early', e);
          this.uiModeData.dblClickTimer = setTimeout(this.uiModeOnCommitClick,
                                                     this.uiModeData.dblClickInterval, e);
        }
      } else {
        this.$emit('singleclick-committed', e);
      }
    },
    uiModeCancelDblClickTimer () {
      clearTimeout(this.uiModeData.dblClickTimer);
      this.uiModeData.dblClickTimer = null;
    },
  },
  mounted () {
    this.map.on('mousedown', this.uiModeOnClick, this);
    window.addEventListener('keyup', this.uiModeOnKey);
  },
  beforeDestroy () {
    window.removeEventListener('keyup', this.uiModeOnKey);
    this.map.off('mousedown', this.uiModeOnClick, this);
    if (this.uiModeData.dblClickTimer !== null) {
      this.uiModeCancelDblClickTimer();
    }
  },
}
