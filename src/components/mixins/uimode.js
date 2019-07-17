export let uiModeMixin = {
  props: {
    map: Object,
    required: true,
  },
  data () {
    return {
      uiModeData: {
        clickTimer: null,
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
      this.uiModeData.clickTimer = null;
    },
    uiModeOnClick (e) {
      if (this.uiModeHandlingDblClicks) {
        if (this.uiModeData.clickTimer !== null) {
          this.uiModeCancelClickTimer();
          this.$emit('doubleclick', e);
        } else {
          this.$emit('singleclick-early', e);
          this.uiModeData.clickTimer = setTimeout(this.uiModeOnCommitClick,
                                                     this.uiModeData.dblClickInterval, e);
        }
      } else {
        this.$emit('singleclick-committed', e);
      }
    },
    uiModeCancelClickTimer () {
      clearTimeout(this.uiModeData.clickTimer);
      this.uiModeData.clickTimer = null;
    },
  },
  mounted () {
    this.map.on('mousedown', this.uiModeOnClick, this);
    window.addEventListener('keyup', this.uiModeOnKey);
  },
  beforeDestroy () {
    window.removeEventListener('keyup', this.uiModeOnKey);
    this.map.off('mousedown', this.uiModeOnClick, this);
    if (this.uiModeData.clickTimer !== null) {
      this.uiModeCancelClickTimer();
    }
  },
}
