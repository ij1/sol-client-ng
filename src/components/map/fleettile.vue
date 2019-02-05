<script>
import { mapGetters } from 'vuex';
import L from 'leaflet';

export default {
  name: 'FleetTile',

  props: {
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
      boatColor: 'race/fleet/boatColor',
    }),
  },
  methods: {
    redraw () {
      let ctx = this.$el.getContext('2d');
      ctx.clearRect(0, 0, this.$parent.tileSize, this.$parent.tileSize);
      this._redraw(ctx);
    },
    _redraw (ctx) {
      let map = this.$parent.$parent.map;
      const boatPath = this.$parent.$parent.boatPath;
      /* Anything > 1/2 boat size is fine */
      const halfsize = 32 / 2;

      const latLngBounds = map.wrapLatLngBounds(this.$parent.mapObject._tileCoordsToBounds(this.coords));
      const sw = map.project(latLngBounds.getSouthWest(), this.coords.z);
      const ne = map.project(latLngBounds.getNorthEast(), this.coords.z);
      const res = this.$store.getters['race/fleet/searchBBox'](latLngBounds, this.coords.z, halfsize);

      ctx.save();
      let prev = L.point(0, 0);
      for (let i of res) {
        const boat = this.fleetBoatFromId(i.id);
        const center = map.project(boat.latLng, this.coords.z).subtract(L.point(sw.x, ne.y));
        const color = this.boatColor(boat);
        ctx.translate(center.x - prev.x, center.y - prev.y);
        ctx.beginPath();
        if (boat.dtg > 0) {
          ctx.rotate(boat.cog);
          ctx.strokeStyle = color;
          ctx.stroke(boatPath);
          ctx.rotate(-boat.cog);
        } else {
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }

        prev = center;
      }
      ctx.restore();
    },
  },

  watch: {
    needsRedraw () {
      this.redraw();
    }
  },

  mounted () {
    this._redraw(this.$el.getContext('2d'));
  },

  render: function (h) {
    const tileSize = this.$parent.tileSize;

    return h('canvas', {
      attrs: {
        width: tileSize,
        height: tileSize,
      },
    });
  },
}
</script>
