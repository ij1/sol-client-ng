<template>
  <div
    v-if = "showCursorAid"
  >
    <div
      id = "aimline-container"
      :style = "[posStyle, rotateStyle]"
    >
      <div
        class = "aimline"
        :style = "{
          height: maxLineLengthPx,
          bottom: cursorFreeCirclePx,
        }"
      />
      <div
        class = "aimline"
        :style = "{
          height: maxLineLengthPx,
          top: cursorFreeCirclePx,
        }"
      />
      <div
        class = "aimline"
        :style = "{
          width: maxLineLengthPx,
          right: cursorFreeCirclePx,
        }"
      />
      <div
        class = "aimline"
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
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { radToDeg, tripleBounds } from '../../lib/utils.js';
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
      mousePos: null,
      cursorFreeCirclePx: '24px',
    }
  },
  computed: {
    showCursorAid () {
      return (this.cfgCursorLines !== 'none') && (this.mousePos !== null);
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
    }),
    ...mapGetters({
      wrappedHoverLatLng: 'map/wrappedHoverLatLng',
      hoverWind: 'map/hoverWind',
    }),
  },

  mounted() {
    this.map.on('mousemove', this.setHoverPos, this);
    this.map.on('mouseout', this.clearHoverPos, this);
    this.map.on('move moveend zoom zoomend', this.updateView, this);
    this.updateView();
  },
  beforeDestroy () {
    this.map.off('mousemove', this.setHoverPos, this);
    this.map.off('mouseout', this.clearHoverPos, this);
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
      /* For some reason it's not camel-cased in the event! */
      this.$store.commit('map/setHover', e.latlng);
      this.mousePos = e.containerPoint;
    },
    clearHoverPos () {
      this.$store.commit('map/setHover', null);
      this.mousePos = null;
    },
  },
}
</script>

<style>
#aimline-container {
  position: absolute;
  pointer-events: none;
  mix-blend-mode: multiply;
  z-index: 999;
}
.aimline {
  position: absolute;
  background: #ddd;
  cursor: crosshair;
  width: 1px;
  height: 1px;
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
