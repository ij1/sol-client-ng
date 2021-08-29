<template>
  <div
    v-if = "showCursorOverlay"
  >
    <div
      v-if = "showCursorAid"
      id = "aimline-container"
      class = "cursor-blend"
      :style = "[posStyle, rotateStyle]"
    >
      <div
        class = "aimline cursorline"
        :style = "{
          height: maxLineLengthPx,
          bottom: cursorFreeCirclePx,
        }"
      />
      <div
        :class = "downwindLineStyle"
        :style = "{
          height: maxLineLengthPx,
          top: cursorFreeCirclePx,
        }"
      />
      <div
        class = "aimline cursorline"
        :style = "{
          width: maxLineLengthPx,
          right: cursorFreeCirclePx,
        }"
      />
      <div
        class = "aimline cursorline"
        :style = "{
          width: maxLineLengthPx,
          left: cursorFreeCirclePx,
        }"
      />
    </div>
    <div
      v-if = "normalCursorAid && wrappedHoverLatLng !== null"
    >
      <div
        id = "loninfo"
        class = "coordinfo"
        :style = "{left: mousePosXpx}"
      >
        <lon-coordinate :lat-lng = "wrappedHoverLatLng"/>
      </div>
      <div
        id = "latinfo"
        class = "coordinfo"
        :style = "{top: mousePosYpx}"
      >
        <lat-coordinate :lat-lng = "wrappedHoverLatLng"/>
      </div>
    </div>
    <div
      v-if = "showCursorScale"
      id = "zoom-box"
      class = "cursorline cursor-blend"
      :style = "[posStyle, scaleStyle]"
    />
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { degToRad, radToDeg, tripleBounds } from '../../lib/utils.js';
import { touchPositionOnElement } from '../../lib/events.js';
import { EARTH_CIRCUMFENCE, OLD_CLIENT_MAXZOOM } from '../../lib/sol.js';
import LatCoordinate from '../latcoordinate.vue';
import LonCoordinate from '../loncoordinate.vue';

export default {
  name: 'MapCursor',

  components: {
    'lat-coordinate': LatCoordinate,
    'lon-coordinate': LonCoordinate,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      inTouch: false,
      lastTouch: 0,
      touchDelay: 250,
      mousePos: null,
      cursorFreeCirclePx: '24px',
      mapContainer: null,
      scaleMeters: 10,
    }
  },
  computed: {
    cursorMetersPerPixel () {
      if (this.hoverLatLng === null) {
        return 1;
      }
      return EARTH_CIRCUMFENCE * Math.cos(degToRad(this.hoverLatLng.lat)) /
             Math.pow(2, this.zoom + 8);
    },
    scaleStyle () {
      const pxSize = (this.scaleMeters / this.cursorMetersPerPixel) + 'px';
      return {
        width: pxSize,
        height: pxSize,
      }
    },
    downwindLineStyle () {
      return {
        'cursorline': true,
        'aimline': !this.windCursorAid,
        'aimline-downwind': this.windCursorAid,
      }
    },
    showCursorOverlay () {
      return (this.cfgCursorLines !== 'none') && (this.mousePos !== null);
    },
    showCursorScale () {
      return (this.cfgCursorLines !== 'none') && (this.zoom > OLD_CLIENT_MAXZOOM);
    },
    showCursorAid () {
      return this.normalCursorAid || this.windCursorAid;
    },
    normalCursorAid () {
      return this.cfgCursorLines === 'normal';
    },
    windCursorAid () {
      return this.cfgCursorLines === 'wind';
    },
    maxLineLengthPx () {
      return (this.mapSize.x + this.mapSize.y) + 'px';
    },
    rotateStyle () {
      if (this.windCursorAid && (this.hoverWind !== null)) {
        return {
          transform: 'rotate(' + radToDeg(this.hoverWind.twd) + 'deg)',
        }
      }
      return {};
    },
    mousePosXpx () {
      return this.mousePos.x + 'px';
    },
    mousePosYpx () {
      return this.mousePos.y + 'px';
    },
    posStyle () {
      return {
        left: this.mousePosXpx,
        top: this.mousePosYpx,
      }
    },
    ...mapState({
      cfgCursorLines: state => state.ui.cfg.cursorLines.value,
      mapSize: state => state.map.size,
      zoom: state => state.map.zoom,
      hoverLatLng: state => state.map.hoverLatLng,
    }),
    ...mapGetters({
      wrappedHoverLatLng: 'map/wrappedHoverLatLng',
      hoverWind: 'map/hoverWind',
    }),
  },

  mounted() {
    this.mapContainer = this.map.getContainer();
    this.mapContainer.addEventListener('touchstart', this.onTouchStart);
    this.mapContainer.addEventListener('touchmove', this.onTouchMove);
    this.mapContainer.addEventListener('touchend', this.onTouchEnd);
    this.mapContainer.addEventListener('touchcancel', this.onTouchCancel);
    this.addMouseHooks();
    this.map.on('move moveend zoom zoomend', this.updateView, this);
    this.updateView();
  },
  beforeDestroy () {
    this.mapContainer.removeEventListener('touchstart', this.onTouchStart);
    this.mapContainer.removeEventListener('touchmove', this.onTouchMove);
    this.mapContainer.removeEventListener('touchend', this.onTouchEnd);
    this.mapContainer.removeEventListener('touchcancel', this.onTouchCancel);
    if (!this.inTouch) {
      this.removeMouseHooks();
    }
    this.map.off('move moveend zoom zoomend', this.updateView, this);
  },

  methods: {
    updateView() {
      const center = this.map.getCenter();
      this.$store.commit('map/setView', {
        center: center,
        zoom: this.map.getZoom(),
        bounds: this.map.getBounds(),
        tripleBounds: tripleBounds(this.map, this.map.getSize()),
      });
      this.$store.commit('boat/updateLngOffset', center.lng);
      if (this.mousePos !== null) {
        this.$store.commit('map/setHover',
                           this.map.containerPointToLatLng(this.mousePos));
      }
    },

    setHoverPos (e) {
      if (this.lastTouch + this.touchDelay > Date.now()) {
        return;
      }
      /* For some reason it's not camel-cased in the event! */
      this.$store.commit('map/setHover', e.latlng);
      this.mousePos = e.containerPoint;
    },
    clearHoverPos () {
      this.$store.commit('map/setHover', null);
      this.mousePos = null;
    },

    addMouseHooks () {
      this.map.on('mousemove', this.setHoverPos, this);
      this.map.on('mouseout', this.clearHoverPos, this);
    },
    removeMouseHooks () {
      this.map.off('mousemove', this.setHoverPos, this);
      this.map.off('mouseout', this.clearHoverPos, this);
    },

    onTouchStart () {
      if (!this.inTouch) {
        this.removeMouseHooks();
      }
      this.inTouch = true;
    },
    onTouchEnd (e) {
      if (e.touches.length > 0) {
        return;
      }
      this.clearHoverPos();
      this.addMouseHooks();
      this.inTouch = false;
      this.lastTouch = Date.now();
    },
    onTouchCancel () {
      this.clearHoverPos();
      this.addMouseHooks();
      this.inTouch = false;
    },
    onTouchMove (e) {
      if (e.touches.length > 1) {
        return;
      }
      const pt = touchPositionOnElement(e.touches[0], this.mapContainer);
      if (pt === null) {
        return;
      }
      this.$store.commit('map/setHover', this.map.containerPointToLatLng(pt));
      this.mousePos = pt;
    },
  },
}
</script>

<style>
#aimline-container {
  position: absolute;
  pointer-events: none;
  z-index: 999;
}
.time-of-day-white .cursor-blend {
  mix-blend-mode: multiply;
}
.time-of-day-dark .cursor-blend {
  mix-blend-mode: screen;
}
.cursorline {
  position: absolute;
  cursor: crosshair;
}
.aimline {
  width: 1px;
  height: 1px;
}
.aimline-downwind {
  width: 3px;
  height: 1px;
}
.time-of-day-white .cursorline {
  background-color: #ddd;
  border-color: #ddd !important;
}
.time-of-day-dark .cursorline {
  background-color: #333;
  border-color: #333 !important;
}
#zoom-box {
  position: absolute;
  border: solid 1px;
  transform: translate(-50%, -50%);
  z-index: 999;
  background-color: unset !important;
}
</style>

<style scoped>
.coordinfo {
  position: absolute;
  pointer-events: none;
  cursor: crosshair;
  font-size: 12px;
  z-index: 999;
}
.time-of-day-white .coordinfo {
  color: #000;
  background: rgba(200, 200, 200, 0.8);
}
.time-of-day-dark .coordinfo {
  color: #0f0;
  background: rgba(60, 60, 60, 0.8);
}
#latinfo {
  right: 2px;
  text-align: right;
  margin-right: 10px;
}
#loninfo {
  top: 2px;
  text-align: left;
  margin-left: 3px;
}
</style>
