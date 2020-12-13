<template>
  <l-control
    :position = "'bottomleft'"
    :disableClickPropagation = "false"
  >
    <div id = "map-scale" :style = "{'min-width': (pxWidth - 2) + 'px'}">
      {{alignedNmWidth}}nm
    </div>
  </l-control>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'MapScale',
  components: {
    'l-control': LControl,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      maxWidth: 100,
    };
  },
  computed: {
    rawNmWidth () {
      this.center.lat;
      this.zoom;

      const mid = this.mapSize.y / 2;
      return this.map.distance(
        this.map.containerPointToLatLng(L.point(this.mapSize.x, mid)),
        this.map.containerPointToLatLng(L.point(this.mapSize.x + this.maxWidth, mid)),
      ) / 1852;
    },
    alignedNmWidth () {
      if (this.rawNmWidth < 1) {
        return this.rawNmWidth.toPrecision(1);
      } else {
	return Number(this.rawNmWidth.toPrecision(1)).toFixed(0);
      }
    },
    pxWidth () {
      return Math.round(this.alignedNmWidth / this.rawNmWidth * this.maxWidth);
    },
    ...mapState({
      center: state => state.map.center,
      zoom: state => state.map.zoom,
      mapSize: state => state.map.size,
    }),
  },
}
</script>

<style scoped>
#map-scale {
  pointer-events: none;
  border: 1px solid;
  border-top: 0px;
  font-size: 11px;
}
.time-of-day-white #map-scale {
  color: #000;
  border-color: #000;
}
.time-of-day-dark #map-scale {
  color: #0f0;
  border-color: #0f0;
}
</style>
