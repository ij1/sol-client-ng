<template>
  <canvas/>
</template>

<script>
import { mapGetters } from 'vuex';
import L from 'leaflet';

export default {
  name: 'FleetTile',

  props: {
    latLngBounds: {
      type: Object,
      required: true,
    },
    coords: {
      type: Object,
      required: true,
    },
  },
  computed: {
    needsRedraw () {
      // ADDME: zoom change requires recalculation due to bounds in pixels
      this.$store.state.race.fleet.fleetTime;
      return Date.now();
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
  },
  methods: {
    redraw () {
      let canvas = this.$el;
      /* Anything > 1/2 boat size is fine */
      const halfsize = 32 / 2;
      canvas.width = this.$parent.layer.getTileSize().x;
      canvas.height = this.$parent.layer.getTileSize().y;

      const sw = this.$parent.map.project(this.latLngBounds.getSouthWest(), this.coords.z);
      const ne = this.$parent.map.project(this.latLngBounds.getNorthEast(), this.coords.z);

      // FIXME: this also uses wrong zoom
      const res = this.$store.getters['race/fleet/searchBBox'](this.latLngBounds, this.$parent.map, halfsize);

      let ctx = canvas.getContext('2d');
      let prev = L.point(0, 0);
      for (let i of res) {
        const boat = this.fleetBoatFromId(i.id);
        const center = this.$parent.map.project(boat.latLng, this.coords.z).subtract(L.point(sw.x, ne.y));
        let color = 'rgb(' + boat.color.r + ',' + boat.color.g + ',' + boat.color.b + ')';
        ctx.translate(center.x - prev.x, center.y - prev.y);
        ctx.beginPath();
        if (boat.dtg > 0) {
          ctx.rotate(boat.cog);
          ctx.strokeStyle = color;
          ctx.stroke(this.$parent.boatPath);
          ctx.rotate(-boat.cog);
        } else {
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }

        prev = center;
      }
    },
  },

  watch: {
    needsRedraw () {
      this.redraw();
    }
  },

  mounted () {
    this.redraw();
  },
}
</script>
