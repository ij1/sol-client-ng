<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { windToColor } from '../../lib/sol.js';

export default {
  name: 'WindMap',
  computed: {
    gridOrigo () {
      const centerPoint = this.$parent.map.latLngToContainerPoint(this.center);

      return L.point(centerPoint.x % this.gridInterval,
                     centerPoint.y % this.gridInterval);
    },
    useArrows () {
      return this.cfgArrowsBarbs === 'arrows';
    },
    needsRedraw () {
      /* Dummy access for the dependencies */
      this.wxLoaded;
      this.wxTime;
      this.gridInterval;
      this.useArrows;
      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      center: state => state.map.center,
      gridInterval: state => state.weather.cfg.gridInterval.value,
      cfgArrowsBarbs: state => state.weather.cfg.arrowsBarbs.value,
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

              if (this.useArrows) {
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
              } else {
                let fiveScale = Math.round(wind.knots / 5);
                ctx.beginPath();
                ctx.lineWidth = 1;
                if (fiveScale > 0) {
                  ctx.moveTo(0, 0);
                  ctx.lineTo(0, -16 - Math.floor(fiveScale / 10) * 6);
                  ctx.stroke();
                  if (fiveScale >= 10) {
                    ctx.beginPath();
                    ctx.lineWidth = 1;
                    ctx.lineJoin = 'miter';
                    ctx.moveTo(0, -18);
                    if (fiveScale >= 20) {
                      ctx.lineTo(0, -30);
                      ctx.lineTo(7, -29);
                      fiveScale -= 10;
                    }
                    ctx.lineTo(0, -24);
                    ctx.lineTo(7, -23);
                    ctx.lineTo(0, -18);
                    ctx.fill();
                    fiveScale -= 10;
                  }
                  /* Limits the scale to 145 knots */
                  fiveScale = Math.min(fiveScale, 9);
                  let y = -16;
                  while (fiveScale >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(7, y-3);
                    ctx.stroke();
                    y += 3;
                    fiveScale -= 2;
                  }
                  if (fiveScale > 0) {
                    if (y === -16) {
                      y += 3;
                    }
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(4, y-2);
                    ctx.stroke();
                  }
                } else {
                  ctx.arc(0, 0, 4, 0, 2 * Math.PI);
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
                  ctx.fill();
                }
              }

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
