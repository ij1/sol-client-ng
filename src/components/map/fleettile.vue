<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { degToRad } from '../../lib/utils.js';
import { cogTwdToTwa } from '../../lib/nav.js';
import { drawBoat } from '../../lib/boatshape.js';

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
      this.fleetTime;
      this.wxUpdated;
      this.zoom;

      return Date.now();
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      boatColor: 'race/fleet/boatColor',
    }),
    ...mapState({
      zoom: state => state.map.zoom,
      fleetTime: state => state.race.fleet.fleetTime,
      wxUpdated: state => state.weather.data.updated,
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
      const descale = map.getZoomScale(this.zoom, this.coords.z);
      const scale = 1 / descale;
      if (scale >= 2) {
        return;
      }
      /* Anything > 1/2 boat size is fine */
      const halfsize = Math.ceil(scale * 40 / 2);

      const latLngBounds = map.wrapLatLngBounds(this.$parent.mapObject._tileCoordsToBounds(this.coords));
      const sw = map.project(latLngBounds.getSouthWest(), this.coords.z);
      const ne = map.project(latLngBounds.getNorthEast(), this.coords.z);
      const res = this.$store.getters['race/fleet/searchBBox'](latLngBounds, this.zoom, halfsize);

      ctx.save();
      let prev = L.point(0, 0);
      for (let i of res) {
        const boat = this.fleetBoatFromId(i.id);
        /* 'i' has both coords for search purposes (with correct lng offset) */
        const center = map.project(i, this.coords.z).subtract(L.point(sw.x, ne.y));
        const color = this.boatColor(boat);
        ctx.translate(center.x - prev.x, center.y - prev.y);
        ctx.beginPath();
        ctx.scale(scale, scale);
        if (boat.dtg > 0) {
          const wind = this.$store.getters['weather/latLngWind'](boat.latLng,
                                                                 this.$store.state.race.fleet.fleetTime);
          let twa = (typeof wind !== 'undefined') ?
                      cogTwdToTwa(boat.cog, wind.twd) : 0;
          /* TWA=0 heuristics for <0.5deg to handle wx & fleet time
           * mismatch and numeric precision challenges
           */
          if (Math.abs(twa) < degToRad(0.5)) {
            twa = 0;
          }

          /* Practice marks */
          if ((boat.ranking === 9999) && boat.name.startsWith('Practice_Mark')) {
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgb(255, 0, 255)';
            ctx.fill();
          } else {
            ctx.strokeStyle = color;
            drawBoat(ctx, boat.cog, twa);
          }
        } else {
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
        ctx.scale(descale, descale);

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
