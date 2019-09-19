export let uiModeMixin = {
  props: {
    map: Object,
    required: true,
  },
  data () {
    return {
      uiModeData: {
        clickTimer: null,
        clickTimerDelay: 250,
        clickDragLimit: 40,
        inClick: false,
        eventData: null,
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
    checkLeftButton (e) {
      return e.button === 0;
    },
    uiModeOnCommitClick (e) {
      if (!this.checkLeftButton(e.originalEvent)) {
        return;
      }
      if (!this.uiModeData.inClick) {
        this.$emit('singleclick-committed', e);
      }
      this.uiModeData.inClick = false;
      this.uiModeData.clickTimer = null;
    },
    uiModeOnMouseUp (e) {
      if (!this.checkLeftButton(e)) {
        return;
      }
      this.uiModeFinishClick();
    },
    uiModeFinishClick () {
      if (!this.uiModeData.inClick) {
        return;
      }
      if (!this.uiModeHandlingDblClicks) {
        this.uiModeCancelClickTimer();
        this.$emit('singleclick-committed', this.uiModeData.eventData);
      } else {
        this.$emit('singleclick-early', this.uiModeData.eventData);
      }
      this.uiModeData.inClick = false;
    },
    uiModeOnClick (e) {
      if (!this.checkLeftButton(e.originalEvent)) {
        return;
      }
      if (this.uiModeData.clickTimer !== null) {
        this.uiModeCancelClickTimer();
        if (!this.uiModeHandlingDblClicks) {
          /* dblclick without mouseup?!? */
          this.uiModeOnMouseUp();
        } else {
          this.$emit('doubleclick', e);
        }
      } else {
        this.uiModeData.eventData = e;
        this.uiModeData.inClick = true;
        this.uiModeData.clickTimer = setTimeout(this.uiModeOnCommitClick,
                                                this.uiModeData.clickTimerDelay, e);
      }
    },
    uiModeOnDragEnd (e) {
      if (e.distance <= this.uiModeData.clickDragLimit) {
        this.uiModeFinishClick();
      }
    },
    uiModeCancelClickTimer () {
      if (this.uiModeData.clickTimer !== null) {
        clearTimeout(this.uiModeData.clickTimer);
        this.uiModeData.clickTimer = null;
      }
    },
  },
  mounted () {
    window.addEventListener('mouseup', this.uiModeOnMouseUp);
    this.map.on('mousedown', this.uiModeOnClick, this);
    window.addEventListener('keydown', this.uiModeOnKey);
    this.map.on('dragend', this.uiModeOnDragEnd, this);
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.uiModeOnKey);
    this.map.off('mousedown', this.uiModeOnClick, this);
    window.removeEventListener('mouseup', this.uiModeOnMouseUp);
    this.map.on('dragend', this.uiModeOnDragEnd, this);
    if (this.uiModeData.clickTimer !== null) {
      this.uiModeCancelClickTimer();
    }
  },
}
