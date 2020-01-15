import L from 'leaflet';

export let uiModeMixin = {
  props: {
    map: Object,
    required: true,
  },
  data () {
    return {
      uiModeData: {
        mapContainer: null,
        clickTimer: null,
        clickTimerDelay: 250,
        clickDragLimit: 40,
        inClick: false,
        inTouch: false,
        touchEndTime: 0,
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
      } else {
        this.removeEndHandler();
        this.uiModeData.inClick = false;
      }
      this.uiModeData.clickTimer = null;
    },
    addEndHandler () {
      window.addEventListener('mouseup', this.uiModeOnEnd);
    },
    removeEndHandler () {
      window.removeEventListener('mouseup', this.uiModeOnEnd);
    },
    uiModeOnEnd (e) {
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
      this.removeEndHandler();
      this.uiModeData.inClick = false;
    },
    uiModeOnClick (e) {
      if (!this.checkLeftButton(e.originalEvent)) {
        return;
      }
      if (this.uiModeData.inTouch) {
        return;
      }
      if (this.uiModeData.touchEndTime + this.uiModeData.clickTimerDelay > Date.now()) {
        return;
      }
      if (this.uiModeData.clickTimer !== null) {
        this.uiModeCancelClickTimer();
        if (!this.uiModeHandlingDblClicks) {
          /* dblclick without mouseup?!? */
          this.uiModeFinishClick();
        } else {
          this.$emit('doubleclick', e);
        }
      } else {
        this.uiModeData.eventData = e;
        this.uiModeData.inClick = true;
        this.addEndHandler();
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

    touchPointToLatLng (touchEv) {
      const tmpPt = L.DomEvent.getMousePosition(touchEv, this.map.getContainer());
      const pt = L.point(Math.floor(tmpPt.x), Math.floor(tmpPt.y));
      if (isNaN(pt.x) || isNaN(pt.y)) {
        return null;
      }
      return this.map.containerPointToLatLng(pt);
    },
    uiModeOnTouchStart (e) {
      if (e.touches.length > 1) {
        return;
      }
      this.uiModeRemoveMouseHooks();
      this.uiModeAddTouchHooks();
      this.uiModeData.inTouch = true;

      const latLng = this.touchPointToLatLng(e.touches[0]);
      if (latLng !== null) {
        this.$emit('touchstart-committed', {
          latlng: latLng,
        });
      }
    },
    uiModeOnTouchEnd (e) {
      if (e.touches.length > 0) {
        return;
      }

      if (e.changedTouches.length === 1) {
        const latLng = this.touchPointToLatLng(e.changedTouches[0]);
        if (latLng !== null) {
          this.$emit('touchend-committed', {
            latlng: latLng,
          });
        }
        this.uiModeData.touchEndTime = Date.now();
      }

      this.uiModeAddMouseHooks();
      this.uiModeRemoveTouchHooks();
      this.uiModeData.inTouch = false;
    },
    uiModeOnTouchCancel () {
      this.uiModeAddMouseHooks();
      this.uiModeRemoveTouchHooks();
      this.uiModeData.inTouch = false;
    },

    uiModeAddMouseHooks () {
      this.map.on('mousedown', this.uiModeOnClick, this);
    },
    uiModeRemoveMouseHooks () {
      this.map.off('mousedown', this.uiModeOnClick, this);
    },
    uiModeAddTouchHooks () {
      this.uiModeData.mapContainer.addEventListener('touchend',
                                                    this.uiModeOnTouchEnd);
      this.uiModeData.mapContainer.addEventListener('touchcancel',
                                                    this.uiModeOnTouchCancel);
    },
    uiModeRemoveTouchHooks () {
      this.uiModeData.mapContainer.removeEventListener('touchend',
                                                       this.uiModeOnTouchEnd);
      this.uiModeData.mapContainer.removeEventListener('touchcancel',
                                                       this.uiModeOnTouchCancel);
    },
  },
  mounted () {
    this.uiModeData.mapContainer = this.map.getContainer();
    this.uiModeData.mapContainer.addEventListener('touchstart',
                                                  this.uiModeOnTouchStart);
    this.uiModeAddMouseHooks();
    window.addEventListener('keydown', this.uiModeOnKey);
    this.map.on('dragend', this.uiModeOnDragEnd, this);
  },
  beforeDestroy () {
    this.uiModeData.mapContainer.removeEventListener('touchstart',
                                                     this.uiModeOnTouchStart);
    window.removeEventListener('keydown', this.uiModeOnKey);
    if (!this.uiModeData.inTouch) {
      this.uiModeRemoveMouseHooks();
    } else {
      this.uiModeRemoveTouchHooks();
    }
    if (this.uiModeData.inClick) {
      this.removeEndHandler();
    }
    this.map.on('dragend', this.uiModeOnDragEnd, this);
    if (this.uiModeData.clickTimer !== null) {
      this.uiModeCancelClickTimer();
    }
  },
}
