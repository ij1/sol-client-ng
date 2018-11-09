<template>
  <div style="display: none;"/>
</template>

<script>
import L from 'leaflet';
import rbush from 'rbush';

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
      searchTree: rbush(),
      boatPath: new Path2D('M -4,16 C -8 2, -6 2, 0 -16 C 6 2, 8 2, 4 16 Z'),
    }
  },
  computed: {
    needsRedraw () {
      // ADDME: zoom change requires recalculation due to bounds in pixels
      this.$store.state.race.fleet.fleetTime;
      return Date.now();
    }
  },
  methods: {
    createTile (coords) {
      let canvas = L.DomUtil.create('canvas');
      // FIXME: don't use literals here
      canvas.width = 256;
      canvas.height = 256;

      const latLngBounds = this.layer._tileCoordsToBounds(coords);
      const sw = this.map.project(latLngBounds.getSouthWest());
      const ne = this.map.project(latLngBounds.getNorthEast());

      const needle = {
        minX: sw.x,
        minY: ne.y,
        maxX: ne.x,
        maxY: sw.y,
      };
      const res = this.searchTree.search(needle);

      let ctx = canvas.getContext('2d');
      let prev = L.point(0, 0);
      for (let i of res) {
        const idx = this.$store.state.race.fleet.id2idx[i.id];
        const boat = this.$store.state.race.fleet.boat[idx];
        const center = this.map.project(boat.latLng).subtract(L.point(sw.x, ne.y));
        ctx.strokeStyle = '#000000';
        ctx.translate(center.x - prev.x, center.y - prev.y);
        ctx.rotate(boat.cog);
        ctx.stroke(this.boatPath);
        ctx.rotate(-boat.cog);

        prev = center;
      }

      return canvas;
    },
  },

  watch: {
    needsRedraw () {
      let data = [];
      const halfsize = 16;

      for (let boat of this.$store.state.race.fleet.boat) {
        const center = this.map.project(boat.latLng);
        let item = {
          minX: center.x - halfsize,
          minY: center.y - halfsize,
          maxX: center.x + halfsize,
          maxY: center.y + halfsize,
          id: boat.id,
        };
        Object.freeze(item);

        data.push(item);
      }

      this.searchTree.clear();
      this.searchTree.load(data);

      this.layer.redraw();
    }
  },

  mounted () {
    const GLayer = L.GridLayer.extend({});
    this.layer = new GLayer();
    this.layer.createTile = this.createTile;
    this.map.addLayer(this.layer);
  },
  beforeDestroy () {
    this.map.removeLayer(this.layer);
  },
}
</script>
