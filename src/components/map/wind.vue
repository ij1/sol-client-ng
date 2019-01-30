<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet'
import { windToColor } from '../../lib/sol.js';

export default {
  name: 'WindMap',
  data () {
    return {
      gridInterval: 64,
    }
  },
  computed: {
    gridOrigo () {
      const centerPoint = this.$parent.map.latLngToContainerPoint(this.$parent.center);

      return L.point(centerPoint.x % this.gridInterval,
                     centerPoint.y % this.gridInterval);
    },
    needsRedraw () {
      /* Dummy access for the dependencies */
      this.wxLoaded;
      this.wxTime;
      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
    }),
    ...mapGetters({
      wxTime: 'weather/time',
    }),
  },
  methods: {
    redraw (ctx) {
      ctx.translate(this.gridOrigo.x, this.gridOrigo.y);
      for (let y = this.gridOrigo.y; y <= this.$parent.size.y; y += this.gridInterval) {
        let xUndo = 0;
        for (let x = this.gridOrigo.x; x <= this.$parent.size.x; x += this.gridInterval) {
          let windPoint = null;
          windPoint = this.$parent.map.containerPointToLatLng(L.point(x, y));
          if (windPoint !== null) {
            windPoint = this.$parent.map.wrapLatLng(windPoint);
            const wind = this.$store.getters['weather/latLngWind'](windPoint);
            if (wind !== undefined) {
              ctx.rotate(wind.twd);
              const color = windToColor(wind.knots);
              ctx.strokeStyle = color;
              ctx.fillStyle = color;

              const lw = wind.knots < 50 ? wind.knots / 10 : 5;
              const len = (wind.knots < 20 ? Math.floor(wind.knots) : 20) + 6;

              ctx.beginPath();
              ctx.lineWidth = 1;
              ctx.lineJoin = 'miter';
              ctx.moveTo(0, 0);
              ctx.lineTo(lw+2, -lw-3);
              ctx.lineTo(-lw-2, -lw-3);
              ctx.fill();
 
              ctx.beginPath();
              ctx.lineWidth = lw+1;
              ctx.lineJoin = 'round';
              ctx.moveTo(0, -lw-2);
              ctx.lineTo(0, -len);
              ctx.stroke();

              ctx.rotate(-wind.twd);
            }
          }
          ctx.translate(this.gridInterval, 0);
          xUndo -= this.gridInterval;
        }
        ctx.translate(xUndo, this.gridInterval);
      }
    },
  },
  render () {
    return null;
  },
}
</script>
