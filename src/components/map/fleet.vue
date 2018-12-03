<template>
  <l-layer-group>
    <boat-trace
      v-if = "this.showLeaderTrace"
      :id = "this.$store.state.race.fleet.leader"
    />
    <boat-trace
      v-for = "trace in this.otherTraces"
      :key = "trace"
      :id = "trace"
    />
  </l-layer-group>
</template>

<script>
import { mapGetters } from 'vuex';
import L from 'leaflet';
import { LLayerGroup } from 'vue2-leaflet';
import BoatTrace from './trace.vue';

export default {
  name: 'FleetMap',
  components: {
    'l-layer-group': LLayerGroup,
    'boat-trace': BoatTrace,
  },

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
    }
  },
  computed: {
    needsRedraw () {
      // ADDME: zoom change requires recalculation due to bounds in pixels
      this.$store.state.race.fleet.fleetTime;
      return Date.now();
    },
    showLeaderTrace () {
      return (this.$store.state.race.fleet.leader !== null) &&
             (this.$store.state.race.fleet.leader !== this.$store.state.boat.id);
    },
    otherTraces () {
      return this.$store.state.race.fleet.selected;
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
  },
  methods: {
    createTile (coords) {
      let canvas = L.DomUtil.create('canvas');
      /* Anything > 1/2 boat size is fine */
      const halfsize = 32 / 2;
      // FIXME: don't use literals here
      canvas.width = 256;
      canvas.height = 256;

      const latLngBounds = this.layer._tileCoordsToBounds(coords);
      const sw = this.map.project(latLngBounds.getSouthWest());
      const ne = this.map.project(latLngBounds.getNorthEast());

      const res = this.$store.getters['race/fleet/searchBBox'](latLngBounds, this.map, halfsize);

      let ctx = canvas.getContext('2d');
      let prev = L.point(0, 0);
      for (let i of res) {
        const boat = this.fleetBoatFromId(i.id);
        const center = this.map.project(boat.latLng).subtract(L.point(sw.x, ne.y));
        let color = 'rgb(' + boat.color.r + ',' + boat.color.g + ',' + boat.color.b + ')';
        ctx.translate(center.x - prev.x, center.y - prev.y);
        ctx.beginPath();
        if (boat.dtg > 0) {
          ctx.rotate(boat.cog);
          ctx.strokeStyle = color;
          ctx.stroke(this.boatPath);
          ctx.rotate(-boat.cog);
        } else {
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }

        prev = center;
      }

      return canvas;
    },
  },

  watch: {
    needsRedraw () {
      this.layer.redraw();
    }
  },

  mounted () {
    const GLayer = L.GridLayer.extend({});
    this.layer = new GLayer();
    this.layer.createTile = this.createTile;
    this.layer.setZIndex(250);
    this.map.addLayer(this.layer);
  },
  beforeDestroy () {
    this.map.removeLayer(this.layer);
    this.layer = null;
  },
}
</script>
