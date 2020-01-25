<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { windToColor, MS_TO_KNT } from '../../lib/sol.js';
import { radToDeg, bsearchLeft } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';

export default {
  name: 'WindMap',
  data () {
    return {
      count: 0,
      // FIXME: move to vuex & add cfg & make many of them
      twsContours: [3, 6, 9, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100],
    }
  },
  computed: {
    gridOrigo () {
      const centerPoint = this.$parent.map.latLngToContainerPoint(this.center);

      return L.point(centerPoint.x % this.gridInterval,
                     centerPoint.y % this.gridInterval);
    },
    useArrows () {
      return this.cfgArrowsBarbs === 'arrows';
    },
    useBarbs () {
      return this.cfgArrowsBarbs === 'barbs';
    },
    needsRedraw () {
      /* Dummy access for the dependencies */
      this.wxLoaded;
      this.wxTime;
      this.gridInterval;
      this.useArrows;
      this.cfgTwsTxt;
      this.cfgTwdTxt;
      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      wxTime: state => state.weather.time,
      wxOrigo: state => state.weather.data.origo,
      wxCellSize: state => state.weather.data.increment,
      wxCells: state => state.weather.data.cells,
      wxBoundary: state => state.weather.data.boundary,
      center: state => state.map.center,
      gridInterval: state => state.weather.cfg.gridInterval.value,
      cfgArrowsBarbs: state => state.weather.cfg.arrowsBarbs.value,
      cfgTwsTxt: state => state.weather.cfg.twsTxt.value,
      cfgTwdTxt: state => state.weather.cfg.twdTxt.value,
      mapBounds: state => state.map.bounds,
      mapSize: state => state.map.size,
    }),
  },
  methods: {
    redraw (ctx) {
      ctx.save();
      this.drawContours(ctx);
      ctx.restore();
      ctx.font = "9px Arial";
      ctx.translate(this.gridOrigo.x, this.gridOrigo.y);
      for (let y = this.gridOrigo.y; y <= this.$parent.size.y; y += this.gridInterval) {
        let xUndo = 0;
        for (let x = this.gridOrigo.x; x <= this.$parent.size.x; x += this.gridInterval) {
          let windPoint = null;
          windPoint = this.$parent.map.containerPointToLatLng(L.point(x, y));
          if (windPoint !== null) {
            windPoint = this.$parent.map.wrapLatLng(windPoint);
            const wind = this.$store.getters['weather/latLngWind'](windPoint);
            if (wind !== null) {
              ctx.rotate(wind.twd);
              const color = windToColor(wind.knots);
              ctx.strokeStyle = color;
              ctx.fillStyle = color;

              if (this.useArrows) {
                const lw = wind.knots < 50 ? wind.knots / 10 : 5;
                const len = (wind.knots < 20 ? Math.floor(wind.knots) : 20) + 6;

                ctx.lineWidth = 1;
                ctx.lineJoin = 'miter';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(lw+2, -lw-3);
                ctx.lineTo(-lw-2, -lw-3);
                ctx.fill();
 
                ctx.lineWidth = lw+1;
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(0, -lw-2);
                ctx.lineTo(0, -len);
                ctx.stroke();
              } else if (this.useBarbs) {
                let fiveScale = Math.round(wind.knots / 5);
                const hemi = windPoint.lat > 0 ? 1 : -1;
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (fiveScale > 0) {
                  ctx.moveTo(0, 0);
                  ctx.lineTo(0, -16 - Math.floor(fiveScale / 10) * 6);
                  ctx.stroke();
                  if (fiveScale >= 10) {
                    ctx.lineWidth = 1;
                    ctx.lineJoin = 'miter';
                    ctx.beginPath();
                    ctx.moveTo(0, -18);
                    if (fiveScale >= 20) {
                      ctx.lineTo(0, -30);
                      ctx.lineTo(7 * hemi, -29);
                      fiveScale -= 10;
                    }
                    ctx.lineTo(0, -24);
                    ctx.lineTo(7 * hemi, -23);
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
                    ctx.lineTo(7 * hemi, y-3);
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
                    ctx.lineTo(4 * hemi, y-2);
                    ctx.stroke();
                  }
                } else {
                  ctx.arc(0, 0, 3, 0, 2 * Math.PI);
                  ctx.stroke();
                  ctx.beginPath();
                  if (wind.knots < 0.5) {
                    ctx.arc(0, 0, 1, 0, 2 * Math.PI);
                    ctx.fill();
                  } else {
                    ctx.moveTo(0, -4);
                    ctx.lineTo(0, -10);
                    ctx.stroke();
                  }
                }
              }

              ctx.rotate(-wind.twd);

              ctx.fillStyle = '#000';
              let twdDeg = radToDeg(wind.twd);
              let y = 7;
              if (90 <= twdDeg && twdDeg <= 180) {
                y = this.cfgTwsTxt && this.cfgTwdTxt ? -11 : -2;
              }
              if (this.cfgTwsTxt) {
                ctx.fillText(roundToFixed(wind.knots, 2), 3, y);
                y += 9;
              }
              if (this.cfgTwdTxt) {
                ctx.fillText(roundToFixed(twdDeg, 2) + '\xb0', 3, y);
              }
            }
          }
          ctx.translate(this.gridInterval, 0);
          xUndo -= this.gridInterval;
        }
        ctx.translate(xUndo, this.gridInterval);
      }
    },
    /*
     * TWS contour calculation
     *
     * We'll loop over y and calculate x roots to find out where the
     * TWS contour is (x is simpler to scale with Mercator as no
     * trigonometry is necessary). The calculation is accurate and
     * a lot of the temporary state can be reused for computing contour
     * for many TWS values.
     *
     * The basic formula behind the logic used here is:
     *
     *  TWS_ms^2 = u^2 + v^2
     *
     * The u and v formulas have two variables, x and y, both second degree.
     *
     * To help calculations, the right-hand side formula is arranged such
     * that coefficient are collected first for x^n and then for y^n.
     * All these can be precalculated (and some terms combined using
     * temporary variables such as A-B):
     *   c_x0_y0 = A^2
     *   c_x0_y1 = -2*A*(A - C)
     *   c_x0_y2 = (A - C)^2
     *   c_x1_y0 = -2*A*(A - B)
     *   c_x1_y1 = 4*A^2 - 4*A*B - 4*A*C + 2*B*C + 2*A*D
     *   c_x1_y2 = -2*(A - C)*(A - B - C + D)
     *   c_x2_y0 = (A - B)^2
     *   c_x2_y1 = -2*(A - B)*(A - B - C + D)
     *   c_x2_y2 = (A - B - C + D)^2
     *
     * where A-D are the corner winds of a wx cell:
     *   C - D
     *   |   |
     *   A - B
     *
     * With all precalculated coefficients we iterate over y (pixels) in
     * a wx cell fixing y and y^2 in the rearranged formula leaving just x
     * to solve in the original equation (that is now in the normal
     * quadratic form).
     *
     * By connecting roots of subsequent y iterations, the contour line
     * is formed. When the roots degenerate to a single root the lines
     * merge (which is detected as edge, the iteration is unlikely to
     * hit the exact value).
     */
    drawContours (ctx) {
      let c = [
        [[], [], []],
        [[], [], []],
        [[], [], []],
      ];
      let qc = [];
      let yToLat = [];
      let twsPaths = [];
      let prevRoots = [];

      if (!this.wxLoaded) {
        return;
      }

      const bounds = this.$parent.map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      let latCells = L.point(sw.lat - this.wxOrigo[0],
                             ne.lat - this.wxOrigo[0])
                        .divideBy(this.wxCellSize[0])
                        .floor();
      latCells = L.point(Math.max(latCells.x, 0),
                         Math.min(latCells.y + 1, this.wxCells[0] - 1));

      let lat = latCells.x * this.wxCellSize[0] + this.wxOrigo[0];
      let yStart;
      if (lat <= sw.lat) {
        yStart = this.mapSize.y;
      } else {
        yStart = Math.ceil(this.$parent.map.latLngToContainerPoint(L.latLng(lat, 0)).y);
      }
      lat = (latCells.y + 1) * this.wxCellSize[0] + this.wxOrigo[0];
      let yEnd;
      if (lat >= ne.lat) {
        yEnd = 0;
      } else {
        yEnd = Math.floor(this.$parent.map.latLngToContainerPoint(L.latLng(lat, 0)).y);
      }
      /* Precalculate y-to-latitude */
      for (let y = yStart; y >= yEnd; y--) {
        yToLat[y] = this.$parent.map.containerPointToLatLng(L.point(0, y)).lat;
      }

      let lng = sw.wrap().lng;
      if (lng >= this.wxBoundary.getEast()) {
        lng -= 360;
      }
      let minCell;
      if (lng <= this.wxOrigo[1]) {
        lng = this.wxOrigo[1];
        minCell = 0;
      } else {
        minCell = Math.floor((lng - this.wxOrigo[1]) / this.wxCellSize[1]);
      }
      let cellDelta = Math.ceil((ne.lng - sw.lng) / this.wxCellSize[1]);
      // FIXME: likely broken when wrapping wx bounds
      const maxCell = Math.min(cellDelta + minCell + 1, this.wxCells[1] - 1);

      const cellStep = this.mapSize.x / (ne.lng - sw.lng) * this.wxCellSize[1];

      for (let lngCell = minCell; lngCell < maxCell; lngCell++) {
        let y = yStart;
        let lngStart = lngCell * this.wxCellSize[1] + this.wxOrigo[1];
        const xStart = this.$parent.map.latLngToContainerPoint(L.latLng(0, lngStart)).x;

        for (let latCell = latCells.x; latCell < latCells.y; latCell++) {
          let cell = this.$store.getters['weather/idxToCell'](latCell, lngCell);
          if (cell === null) {
            if (this.count++ < 100) {
              console.log('skipped cell ' + latCell + ' ' + lngCell);
            }
            continue;
          }
          let latStart = latCell * this.wxCellSize[0] + this.wxOrigo[0];

          let minTwsMs = 0;
          let maxTwsMs = 0;
          const wind = cell.wind;

          /* Lets do some simple contour math first. */
          for (let i = 0; i <= 1; i++) {

            /* u,v limits for TWS upper and lower bound calculations */
            let minComp = Number.MAX_VALUE;
            let maxComp = -Number.MAX_VALUE;
            for (let j = 0; j < 3; j++) {
               minComp = Math.min(minComp, wind[j][i]);
               maxComp = Math.max(maxComp, wind[j][i]);
            }

            let tmp = Math.max(Math.abs(minComp), Math.abs(maxComp));
            maxTwsMs += tmp * tmp;
            /* If wind component crosses zero, no lower bounding is possible */
            if (Math.sign(minComp) === Math.sign(maxComp)) {
              const tmp = Math.min(Math.abs(minComp), Math.abs(maxComp));
              minTwsMs += tmp * tmp;
            }

            /* Coefficient precalculations, i = 0,1 is for u,v, respectively. */
            let asubb = wind[0][i] - wind[1][i];
            let asubc = wind[0][i] - wind[2][i];
            let abcd = asubb - wind[2][i] + wind[3][i];
            let squarea = wind[0][i] * wind[0][i];

            c[0][0][i] = squarea;
            c[0][1][i] = -2 * wind[0][i] * asubc;
            c[0][2][i] = asubc * asubc;
            c[1][0][i] = -2 * wind[0][i] * asubb;
            c[1][1][i] = 4 * (squarea -
                                  wind[0][i] * (wind[1][i] + wind[2][i])) +
                             2 * (wind[1][i] * wind[2][i] +
                                  wind[0][i] * wind[3][i]);
            c[1][2][i] = -2 * asubc * abcd;
            c[2][0][i] = asubb * asubb;
            c[2][1][i] = -2 * asubb * abcd;
            c[2][2][i] = abcd * abcd;
          }

          maxTwsMs = Math.sqrt(maxTwsMs);
          minTwsMs = Math.sqrt(minTwsMs);

          const cellEndLat = (latCell + 1) * this.wxCellSize[0] + this.wxOrigo[0];

          let minTwsIdx = bsearchLeft(this.twsContours, minTwsMs * MS_TO_KNT);
          let maxTwsIdx = bsearchLeft(this.twsContours, maxTwsMs * MS_TO_KNT);
          for (let twsIdx = minTwsIdx; twsIdx <= maxTwsIdx; twsIdx++) {
            twsPaths[twsIdx] = [null, null];
            prevRoots[twsIdx] = [null, null];
          }

          while (y >= yEnd) {
            if (yToLat[y] > cellEndLat) {
              break;
            }
            let yInCell = (yToLat[y] - latStart) / this.wxCellSize[0];
            /* Deal with computational inaccuracies */
            if (yInCell < 0 && yInCell > 0.00001) {
              yInCell = 0;
            }
            if (yInCell > 1 && yInCell < 1.00001) {
              yInCell = 1;
            }
            if (yInCell < 0 || yInCell > 1) {
              if (this.count++ < 100) {
                console.log('y scaling error ' + yInCell + ' ' + yToLat[y] +
                            ' - ' + latStart + ' in cell ');
                console.log(cell);
              }
              y--;
              continue;
            }
            const squarey = yInCell * yInCell;
            /*
             * Coefficients for the quadratic polynomial:
             *   qc[2] * x^2 + qc[1] * x + qc[0] - TWS_ms^2 = 0
             */
            for (let i = 0; i <= 2; i++) {
              qc[i] = (c[i][0][0] + c[i][0][1]) +
                      (c[i][1][0] + c[i][1][1]) * yInCell +
                      (c[i][2][0] + c[i][2][1]) * squarey;
            }

            for (let twsIdx = minTwsIdx; twsIdx <= maxTwsIdx; twsIdx++) {
              let twsms = this.twsContours[twsIdx] / MS_TO_KNT;
              let c = qc[0] - twsms * twsms;

              /*
               * Solve x roots using the quadratic formula. Detect conditions:
               *   - No roots with D < 0. Find where D turns positive indicating
               *     merging of the roots.
               *   - a = 0 (degenerates to line, solve differently)
               */
              const discr = qc[1] * qc[1] - 4 * qc[2] * c;

              if (discr >= 0.0) {
                let roots = [];

                if (discr === 0.0) {
                  /* Exactly at the root boundary */
                  roots[0] = -qc[1] / (2 * qc[2]);
                  roots[1] = roots[0];
                } else if (qc[2] === 0.0) {
                  /* bx + c = 0 => x = -c/b */
                  roots[0] = -c / qc[1];
                  roots[1] = roots[0];
                } else {
                  const tmp = Math.sqrt(discr);
                  roots[0] = (-qc[1] + tmp) / (2 * qc[2]);
                  roots[1] = (-qc[1] - tmp) / (2 * qc[2]);
                }

                /* Prepare paths */
                for (let r = 0; r < 1; r++) {
                  if (roots[r] >= 0 && roots[r] <= 1) {
                    const windPoint = L.latLng(yToLat[y],
                                               roots[r] * this.wxCellSize[1] + lngStart);
                    const wind = this.$store.getters['weather/latLngWind'](windPoint);
                    if (Math.abs(wind.knots - this.twsContours[twsIdx]) > 0.00001) {
                      if (this.count++ < 100) {
                        console.log('contours calc error ' + wind.knots + ' vs ' + this.twsContours[twsIdx]);
                      }
                    }
                    let x = Math.round(cellStep * roots[r] + xStart);
                    if (twsPaths[twsIdx][r] === null) {
                      twsPaths[twsIdx][r] = new Path2D();
                      if (prevRoots[twsIdx][r] !== null) {
                        const tmp = Math.max(Math.min(prevRoots[r], 1), 0);
                        const x2 = Math.round(cellStep * tmp + xStart);
                        twsPaths[twsIdx][r].moveTo(x2, y);
                        twsPaths[twsIdx][r].lineTo(x, y);
                      } else {
                        twsPaths[twsIdx][r].moveTo(x, y);
                      }
                    } else {
                      twsPaths[twsIdx][r].lineTo(x, y);
                    }
                  } else {
                    if (twsPaths[twsIdx][r] !== null) {
                      let x;
                      if (roots[r] < 0) {
                        x = Math.round(xStart);
                      } else {
                        x = Math.round(cellStep + xStart);
                      }
                      twsPaths[twsIdx][r].lineTo(x, y);
                      this.drawContourPath(ctx, twsPaths, twsIdx, r);
                    }
                  }
                }
                prevRoots[twsIdx][0] = roots[0];
                prevRoots[twsIdx][1] = roots[1];
              } else {
                for (let r = 0; r < 1; r++) {
                  if (twsPaths[twsIdx][r] !== null) {
                    if (prevRoots[twsIdx][r ^ 1] !== null) {
                      const tmp = Math.max(Math.min(prevRoots[r ^ 1], 1), 0);
                      const x = Math.round(cellStep * tmp + xStart);
                      prevRoots[twsIdx][r ^ 1] = null;
                      twsPaths[twsIdx][r].lineTo(x, y-1);
                    }
                    this.drawContourPath(ctx, twsPaths, twsIdx, r);
                  }
                }
                prevRoots[twsIdx][0] = null;
                prevRoots[twsIdx][1] = null;
              }
            }
            y--;
          }
          /* Flush the remaining ones. ADDME: draw to boundary/across? */
          for (let twsIdx = minTwsIdx; twsIdx <= maxTwsIdx; twsIdx++) {
            for (let r = 0; r < 1; r++) {
              if (twsPaths[twsIdx][r] !== null) {
                this.drawContourPath(ctx, twsPaths, twsIdx, r);
              }
            }
          }
        }
      }
    },
    drawContourPath(ctx, twsPaths, twsIdx, root) {
      twsPaths[twsIdx][root].moveTo(0, 0);
      const color = windToColor(this.twsContours[twsIdx]);
      ctx.strokeStyle = color;
      ctx.stroke(twsPaths[twsIdx][root]);
      twsPaths[twsIdx][root] = null;
    },
  },
  render () {
    return null;
  },
}
</script>
