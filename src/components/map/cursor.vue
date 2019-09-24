<template>
  <div
    v-if = "showCursorAid"
  >
    <div
      :style = "{
        top: mousePos.y + 'px',
        left: (mousePos.x + cursorFreeCircle) + 'px'
      }"
      class = "aimline hline"
    />
    <div
      :style = "{
        top: mousePos.y + 'px',
        right: 'calc(100% - ' + (mousePos.x - cursorFreeCircle) + 'px)'
      }"
      class = "aimline hline"
    />
    <div
      :style = "{
        left: mousePos.x + 'px',
        top: (mousePos.y + cursorFreeCircle) + 'px'
      }"
      class = "aimline vline"
    />
    <div
      :style = "{
        left: mousePos.x + 'px',
        bottom: 'calc(100% - ' + (mousePos.y - cursorFreeCircle) + 'px)'
      }"
      class = "aimline vline"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { tripleBounds } from '../../lib/utils.js';

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
    }
  },
  computed: {
    showCursorAid () {
      return (this.cfgCursorLines === 'normal') &&
             (this.mousePos !== null);
    },
    ...mapState({
      cfgCursorLines: state => state.ui.cfg.cursorLines.value,
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
}

.hline {
  width: 100%;
  height: 1px;
}

.vline {
  width: 1px;
  height: 100%;
}
</style>
