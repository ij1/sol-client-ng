<template>
  <div
    v-if = "showCursorAid"
  >
    <div
      v-for = "i in angles"
      :key = "i"
      :style = "{
        top: mousePosYpx,
        left: mousePosXpx,
        transform: 'translate(0, ' + cursorFreeCircle + 'px) rotate(' + (i + twd) + 'deg)'
      }"
      class = "aimline"
    />
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { radToDeg, tripleBounds } from '../../lib/utils.js';

export default {
  name: 'MapCursor',

  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      mousePos: null,
      cursorFreeCircle: 24,
      angles: [0, 90, 180, 270],
    }
  },
  computed: {
    showCursorAid () {
      return (this.cfgCursorLines !== 'none') && (this.mousePos !== null);
    },
    windCursorAid () {
      return this.cfgCursorLines === 'wind';
    },
    twd () {
      if ((this.hoverWind !== null) && this.windCursorAid) {
        return radToDeg(this.hoverWind.twd);
      }
      return 0;
    },
    mousePosXpx () {
      return this.mousePos.x + 'px';
    },
    mousePosYpx () {
      return this.mousePos.y + 'px';
    },
    ...mapState({
      cfgCursorLines: state => state.ui.cfg.cursorLines.value,
    }),
    ...mapGetters({
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
.aimline {
  position: absolute;
  background: #ddd;
  mix-blend-mode: multiply;
  z-index: 999;
  pointer-events: none;
  cursor: crosshair;
  height: 100%;
  width: 1px;
  transform-origin: 0 -24px;		/* -this.cursorFreeCircle */
}
</style>
