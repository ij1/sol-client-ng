<template>
  <div style="display: none;">
  </div>
</template>

<script>
import Vue from 'vue';
import L from 'leaflet';
import FleetTile from './fleettile.vue';

export default {
  name: 'FleetMap',

  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      layer: null,
      boatPath: new Path2D('M -3,11 C -6 -1, -2 1, 0 -11 C 2 1, 6 -1, 3,11 Z'),
      tileComponents: {},
    }
  },
  methods: {
    createTile (coords) {
      let div = L.DomUtil.create('div');
      let dummy = L.DomUtil.create('div');
      div.appendChild(dummy);
      const latLngBounds = this.layer._tileCoordsToBounds(coords);

      const FleetTileCtor = Vue.extend(FleetTile);
      const fleetTileInstance = new FleetTileCtor({
        el: dummy,
        replace: false,
        parent: this,
        propsData: {
          latLngBounds: this.map.wrapLatLngBounds(latLngBounds),
          coords: coords,
        }
      });

      const key = this.layer._tileCoordsToKey(coords);
      this.tileComponents[key] = fleetTileInstance;

      return div;
    },
    onUnload (e) {
      const key = this.layer._tileCoordsToKey(e.coords);
      if (typeof this.tileComponents[key] !== 'undefined') {
        this.tileComponents[key].$destroy();
        this.tileComponents[key].$el.remove();
        delete this.tileComponents[key];
      }
    },
  },

  mounted () {
    const GLayer = L.GridLayer.extend({
      options: {
        noWrap: true,
      },
    });
    this.layer = new GLayer();
    this.layer.createTile = this.createTile;
    this.layer.setZIndex(250);
    this.layer.on('tileunload', this.onUnload, this);
    this.map.addLayer(this.layer);
  },
  beforeDestroy () {
    this.map.removeLayer(this.layer);
    this.layer.off('tileunload', this.onUnload);
    this.layer = null;
  },
}
</script>
