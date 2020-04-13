<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { windToColor, MS_TO_KNT } from '../../lib/sol.js';
import { radToDeg, bsearchLeft } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';

function compareCrossing(a, b) {
  return a[0] - b[0];
}

export default {
  name: 'WindMap',
  data () {
    return {
      count: 0,
    }
  },
  computed: {
    labelCol () {
      return this.currentDayNight === 'white' ? '#000' : '#0f0';
    },
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
      this.cfgTwsContours;
      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    twsContourColor () {
      return this.twsContours.map(windToColor);
    },
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      wxTime: state => state.weather.time,
      wxOrigo: state => state.weather.data.origo,
      wxCellSize: state => state.weather.data.cellSize,
      wxCells: state => state.weather.data.cells,
      wxBoundary: state => state.weather.data.boundary,
      center: state => state.map.center,
      gridInterval: state => state.weather.cfg.gridInterval.value,
      cfgArrowsBarbs: state => state.weather.cfg.arrowsBarbs.value,
      cfgTwsTxt: state => state.weather.cfg.twsTxt.value,
      cfgTwdTxt: state => state.weather.cfg.twdTxt.value,
      cfgTwsContours: state => state.weather.cfg.twsDensity.value,
      mapBounds: state => state.map.bounds,
      mapSize: state => state.map.size,
      zoom: state => state.map.zoom,
    }),
    ...mapGetters({
      twsContours: 'weather/twsContours',
      currentDayNight: 'ui/currentDayNight',
    }),
  },
  methods: {
    drawArrow (ctx, knots) {
      const lw = knots < 50 ? knots / 10 : 5;
      const len = (knots < 20 ? Math.floor(knots) : 20) + 6;

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
    },
    drawBarb (ctx, knots, lat) {
      let fiveScale = Math.round(knots / 5);
      const hemi = lat > 0 ? 1 : -1;
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
        if (knots < 0.5) {
          ctx.arc(0, 0, 1, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.moveTo(0, -4);
          ctx.lineTo(0, -10);
          ctx.stroke();
        }
      }
    },
    drawWindLabels (ctx, twd, knots) {
      ctx.fillStyle = this.labelCol;
      let twdDeg = radToDeg(twd);
      let y = 7;
      if (90 <= twdDeg && twdDeg <= 180) {
        y = this.cfgTwsTxt && this.cfgTwdTxt ? -11 : -2;
      }
      if (this.cfgTwsTxt) {
        ctx.fillText(roundToFixed(knots, 2), 3, y);
        y += 9;
      }
      if (this.cfgTwdTxt) {
        ctx.fillText(roundToFixed(twdDeg, 2) + '\xb0', 3, y);
      }
    },
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
                this.drawArrow(ctx, wind.knots);
              } else if (this.useBarbs) {
                this.drawBarb(ctx, wind.knots, windPoint.lat);
              }
              ctx.rotate(-wind.twd);

              this.drawWindLabels(ctx, wind.twd, wind.knots);
            }
          }
          ctx.translate(this.gridInterval, 0);
          xUndo -= this.gridInterval;
        }
        ctx.translate(xUndo, this.gridInterval);
      }
    },
    logError (error) {
      this.$store.dispatch('diagnostics/add', 'WX contours calc error: ' + error);
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
      if (!this.wxLoaded || (this.twsContours.length === 0)) {
        return;
      }

      let yToLat = [];

      const bounds = this.$parent.map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      let latCells = L.point(sw.lat - this.wxOrigo[0],
                             ne.lat - this.wxOrigo[0])
                        .divideBy(this.wxCellSize[0])
                        .floor();
      latCells = L.point(Math.max(latCells.x, 0),
                         Math.min(latCells.y, this.wxCells[0] - 1));

      let boundLat = latCells.x * this.wxCellSize[0] + this.wxOrigo[0];
      let yStart;
      if (boundLat < sw.lat) {
        yStart = this.mapSize.y;
      } else {
        yStart = Math.floor(this.$parent.map.latLngToContainerPoint(L.latLng(boundLat, 0)).y) - 1;
      }
      boundLat = (latCells.y + 1) * this.wxCellSize[0] + this.wxOrigo[0];
      let yEnd;
      if (boundLat > ne.lat) {
        yEnd = 0;
      } else {
        yEnd = Math.ceil(this.$parent.map.latLngToContainerPoint(L.latLng(boundLat, 0)).y) + 1;
      }
      /* Precalculate y-to-latitude */
      for (let y = yStart; y >= yEnd; y--) {
        yToLat[y] = this.$parent.map.containerPointToLatLng(L.point(0, y)).lat;
      }
      if ((yToLat[yStart] < this.wxOrigo[0]) ||
          (yToLat[yEnd] > this.wxCells[0] * this.wxCellSize[0] + this.wxOrigo[0])) {
        this.logError('contour lat ' + yToLat[yStart] + '-' + yToLat[yEnd] +
                      ' exceeding wx boundaries ' + this.wxOrigo[0] + '-' +
                      (this.wxCells[0] * this.wxCellSize[0] + this.wxOrigo[0]));
        return;
      }

      let minFrac = (sw.lng - this.wxOrigo[1]) / 360.0;
      let maxFrac = (ne.lng - this.wxOrigo[1]) / 360.0;
      let maxWxFrac = (this.wxBoundary.getEast() - this.wxOrigo[1]) / 360.0;

      let minWrap = Math.floor(minFrac);
      const maxWrap = Math.floor(maxFrac);

      minFrac -= minWrap;
      maxFrac -= maxWrap;

      if (minFrac >= maxWxFrac) {
        minFrac = 0;
        minWrap += 1;
      }

      /* No WX in view */
      if (maxWrap < minWrap || (minWrap === maxWrap && minFrac >= maxFrac)) {
        return;
      }

      let minCell = Math.floor(minFrac / maxWxFrac * this.wxCells[1]);
      let maxCell = Math.min(Math.floor(maxFrac / maxWxFrac * this.wxCells[1]),
                             this.wxCells[1] - 1);

      const cellStep = this.mapSize.x / (ne.lng - sw.lng) * this.wxCellSize[1];

      /* WX wrapping? */
      let firstMaxCell = maxCell;
      if (maxWrap > minWrap) {
        firstMaxCell = this.wxCells[1] - 1;
      }

      this.__drawContours(ctx, minCell, firstMaxCell, latCells.x, latCells.y,
                          yToLat, yStart, yEnd, cellStep,
                          minWrap, maxWrap);

      /* Handle right-edge partial (/rest) drawing */
      if (minWrap !== maxWrap && minCell > 0) {
        /* Full area visible at least once so draw all remaining parts */
        if (maxWrap - minWrap > 1) {
          maxCell = minCell;
        }
        this.__drawContours(ctx, 0, maxCell, latCells.x, latCells.y,
                            yToLat, yStart, yEnd, cellStep,
                            minWrap + 1, maxWrap);
      }
    },
    __drawContours (ctx, minLngCell, maxLngCell, minLatCell, maxLatCell,
                    yToLat, yStart, yEnd, cellStep, minWrap, maxWrap) {
      const baseWrap = minWrap === maxWrap ? minWrap : 0;
      const wrapOffset = 256 * 2 ** this.zoom;
      const baseOffset = baseWrap * wrapOffset;

      let coeffs = [
        [[], [], []],
        [[], [], []],
        [[], [], []],
      ];
      let qc = [];
      let twsDatas = [];
      let roots = [0, 0];
      /* Boundary conditions are not stable enough numerically, flag and
       * force expected x = 0 or x = 1.
       */
      let forceNumStability = [ false, false ];
      let rootForced = [ false, false ];

      for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
        let y = yStart;
        let lngStart = lngCell * this.wxCellSize[1] + this.wxOrigo[1];
        const xStart = this.$parent.map.latLngToContainerPoint(L.latLng(0, lngStart)).x;

        for (let twsIdx = 0; twsIdx < this.twsContours.length; twsIdx++) {
          twsDatas[twsIdx] = {
            paths: [new Path2D(), new Path2D()],
            useMove: [true, true],
            draw: [false, false],
            edgeCrossing: null,
            prevYInCell: -1,
            prevDiscr: null,
            prevDiscrY: null,
            prevRoots: [0, 0],
          };
        }


        for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
          let wind = this.$store.getters['weather/idxToCell'](latCell, lngCell);
          if (wind === null) {
            this.logError('skipped contour cell ' + latCell + ' ' + lngCell);
            return;
          }
          let latStart = latCell * this.wxCellSize[0] + this.wxOrigo[0];

          let minTwsMs = 0;
          let maxTwsMs = 0;

          /* Lets do some simple contour math first. */
          for (let i = 0; i <= 1; i++) {

            /* u,v limits for TWS upper and lower bound calculations */
            let minComp = Number.MAX_VALUE;
            let maxComp = -Number.MAX_VALUE;
            for (let j = 0; j < 4; j++) {
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

            coeffs[0][0][i] = squarea;
            coeffs[0][1][i] = -2 * wind[0][i] * asubc;
            coeffs[0][2][i] = asubc * asubc;
            coeffs[1][0][i] = -2 * wind[0][i] * asubb;
            coeffs[1][1][i] = 4 * (squarea -
                                   wind[0][i] * (wind[1][i] + wind[2][i])) +
                              2 * (wind[1][i] * wind[2][i] +
                                   wind[0][i] * wind[3][i]);
            coeffs[1][2][i] = -2 * asubc * abcd;
            coeffs[2][0][i] = asubb * asubb;
            coeffs[2][1][i] = -2 * asubb * abcd;
            coeffs[2][2][i] = abcd * abcd;
          }

          maxTwsMs = Math.sqrt(maxTwsMs);
          minTwsMs = Math.sqrt(minTwsMs);

          const cellEndLat = (latCell + 1) * this.wxCellSize[0] + this.wxOrigo[0];

          let minTwsIdx = bsearchLeft(this.twsContours, minTwsMs * MS_TO_KNT);
          let maxTwsIdx = Math.min(bsearchLeft(this.twsContours,
                                               maxTwsMs * MS_TO_KNT),
                                   this.twsContours.length - 1);

          const yInCellStart = (y > yStart) ? 0 :
                               (yToLat[y] - latStart) / this.wxCellSize[0];

          for (let twsIdx = minTwsIdx; twsIdx <= maxTwsIdx; twsIdx++) {
            let twsData = twsDatas[twsIdx];
            twsData.edgeCrossing = [];

            for (let e = 0; e <= 1; e++) {
              let twsms = this.twsContours[twsIdx] / MS_TO_KNT;
              let a = 0;
              let b = 0;
              let c = -(twsms * twsms);
              if (e === 0) {
                a = coeffs[0][2][0] + coeffs[0][2][1];
                b = coeffs[0][1][0] + coeffs[0][1][1];
                c += coeffs[0][0][0] + coeffs[0][0][1];
              } else {
                for (let i = 0; i <= 1; i++) {
                  let bsubd = wind[1][i] - wind[3][i];
                  a += bsubd * bsubd;
                  b += -2 * wind[1][i] * bsubd;
                  c += wind[1][i] * wind[1][i];
                }
              }
              let discr = b * b - 4 * a * c;

              if (a === 0) {
                /* bx + c = 0 => x = -c/b */
                if (b !== 0) {
                  const res = -c / b;
                  if (res >= 0 && res >= yInCellStart && res <= 1) {
                    twsData.edgeCrossing.push([res, e]);
                  }
                }
              } else if (discr >= 0) {
                const tmp = Math.sqrt(discr);
                const res = (-b - tmp) / (2 * a);
                if (res >= 0 && res >= yInCellStart && res <= 1) {
                  twsData.edgeCrossing.push([res, e]);
                }
                if (discr > 0) {
                  const res2 = (-b + tmp) / (2 * a);
                  if (res2 >= 0 && res2 >= yInCellStart && res2 <= 1) {
                    twsData.edgeCrossing.push([res2, e]);
                  }
                }
              }
            }
            twsData.edgeCrossing.sort(compareCrossing);
          }

          let firstIter = true;
          let nextEdge = null;
          let lastIter = false;
          while (y >= yEnd) {
            let yInCell;
            let lat;
            let nextY = y - 1;

            if (firstIter && y > yStart) {
              lat = latStart;
              yInCell = 0;
              nextY = y;
              firstIter = false;

            } else if ((yToLat[y] > cellEndLat) && (nextEdge === null)) {
              if (lastIter) {
                break;
              }
              lastIter = true;
              yInCell = 1;
              nextY = y;
            } else {
              if ((nextEdge !== null) && (nextEdge > 1)) {
                this.logError('nextEdge > 1: ' + nextEdge);
                return;
              }

              lat = yToLat[y];
              yInCell = (lat - latStart) / this.wxCellSize[0];
              if ((nextEdge !== null) && nextEdge < yInCell) {
                yInCell = nextEdge;
                nextY = y;
                nextEdge = null;
              }

              /* Deal with computational inaccuracies */
              if (yInCell < 0 && yInCell > -0.00001) {
                y--;
                continue;
              }
              if (yInCell > 1 && yInCell < 1.00001) {
                yInCell = 1;
              }
              if (yInCell < 0 || yInCell > 1) {
                this.logError('y scaling error for lat ' + lat + ' - ' +
                              latStart + ' = ' + yInCell + ' in cell ');
                return;
              }
            }
            const squarey = yInCell * yInCell;
            /*
             * Coefficients for the quadratic polynomial:
             *   qc[2] * x^2 + qc[1] * x + qc[0] - TWS_ms^2 = 0
             */
            for (let i = 0; i <= 2; i++) {
              qc[i] = (coeffs[i][0][0] + coeffs[i][0][1]) +
                      (coeffs[i][1][0] + coeffs[i][1][1]) * yInCell +
                      (coeffs[i][2][0] + coeffs[i][2][1]) * squarey;
            }

            for (let twsIdx = minTwsIdx; twsIdx <= maxTwsIdx; twsIdx++) {
              let twsData = twsDatas[twsIdx];
              forceNumStability[0] = false;
              forceNumStability[1] = false;
              rootForced[0] = false;
              rootForced[1] = false;

              while ((twsData.edgeCrossing.length > 0) &&
                     (yInCell + 1e-10 >= twsData.edgeCrossing[0][0])) {
                let tmp = twsData.edgeCrossing.shift();
                forceNumStability[tmp[1]] = true;
                if (Math.abs(tmp[0] - yInCell) > 0.05) {
                  this.logError('consumed ' + tmp[0] +
                                ' at y ' + yInCell + ' px=' + y +
                                ' prev ' + twsData.prevYInCell);
                }
              }
              twsData.prevYInCell = yInCell;
              if (twsData.edgeCrossing.length > 0) {
                if ((nextEdge === null) ||
                    (nextEdge > twsData.edgeCrossing[0][0])) {
                  nextEdge = twsData.edgeCrossing[0][0];
                }
              }

              /* Horizontal or nearly horizontal lines, mostly occurs
               * on WRF dummy extension but might occur elsewhere very
               * infrequently.
               */
              if (forceNumStability[0] && forceNumStability[1] &&
                  Math.abs(qc[2]) < 1e-10 && Math.abs(qc[1]) < 1e-10)
              {
                twsData.paths[0].moveTo(baseOffset + xStart, y);
                let x = Math.round(cellStep * 1 + xStart);
                twsData.paths[0].lineTo(baseOffset + x, y);
                twsData.useMove[0] = true;
                twsData.useMove[1] = true;
                twsData.draw[0] = true;
                twsData.prevDiscr = null;
                twsData.prevDiscrY = y;
                continue;
              }

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
                for (let r = 0; r <= 1; r++) {
                  const useMove = twsData.useMove[r];
                  if (forceNumStability[0] && (Math.abs(roots[r] - 0) < 0.0001)) {
                    roots[r] = 0;
                    rootForced[0] = true;
                    if (!useMove) {
                      twsData.useMove[r] = true;
                    }
                  }
                  if (forceNumStability[1] && (Math.abs(roots[r] - 1) < 0.0001)) {
                    roots[r] = 1;
                    rootForced[1] = true;
                    if (!useMove) {
                      twsData.useMove[r] = true;
                    }
                  }
                  if ((roots[r] >= 0) && (roots[r] <= 1)) {
                    let x = Math.round(cellStep * roots[r] + xStart);
                    if (useMove) {
                      twsData.paths[r].moveTo(baseOffset + x, y);
                      twsData.useMove[r] = false;
                    } else {
                      twsData.paths[r].lineTo(baseOffset + x, y);
                      twsData.draw[r] = true;
                    }

                    /* Discriminant sign change - to + */
                    if ((twsData.prevDiscr !== null) &&
                        (twsData.prevDiscr < 0) &&
                        (twsData.prevDiscrY - y <= 1) &&
                        (r === 0)) {
                      const tmp = Math.min(Math.max(roots[1], 0), 1);
                      const x2 = Math.round(cellStep * tmp + xStart);
                      twsData.paths[0].lineTo(baseOffset + x2, y);
                      twsData.paths[0].moveTo(baseOffset + x, y);
                      twsData.draw[0] = true;
                    }
                  } else {
                    twsData.useMove[r] = true;
                  }
                  twsData.prevRoots[r] = roots[r];
                }
                for (let i = 0; i <= 1; i++) {
                  if (forceNumStability[i] !== rootForced[i]) {
                    this.logError('Numerical stability failure for ' + i +
                                  ', roots: ' +
                                  roots[0] + ' ' + roots[1] +
                                  ' qc[2]=' + qc[2] +
                                  ' at y ' + yInCell + ' px=' + y);
                  }
                }
              } else {
                /* Discriminant sign change + to - */
                if ((twsData.prevDiscr !== null) &&
                    (twsData.prevDiscr >= 0) &&
                    (twsData.prevDiscrY - y <= 1)) {
                  const tmp = Math.min(Math.max(twsData.prevRoots[0], 0), 1);
                  const tmp2 = Math.min(Math.max(twsData.prevRoots[1], 0), 1);
                  /* Spanning the wx cell? */
                  if (tmp !== tmp2) {
                    const x = Math.round(cellStep * tmp + xStart);
                    const x2 = Math.round(cellStep * tmp2 + xStart);
                    twsData.paths[0].moveTo(baseOffset + x, twsData.prevDiscrY);
                    twsData.paths[0].lineTo(baseOffset + x2, twsData.prevDiscrY);
                    twsData.draw[0] = true;
                  }
                }

                twsData.useMove[0] = true;
                twsData.useMove[1] = true;
                for (let i = 0; i <= 1; i++) {
                  if (forceNumStability[i]) {
                    this.logError('Numerical stability failure for ' + i +
                                  ', discriminant: ' + discr +
                                  ' qc[2]=' + qc[2] +
                                  ' at y ' + yInCell + ' px=' + y);
                  }
                }
              }
              twsData.prevDiscr = discr;
              twsData.prevDiscrY = y;
            }
            y = nextY;
          }
        }

        /* Flush the full column of contours */
        for (let twsIdx = this.twsContours.length - 1; twsIdx >= 0; twsIdx--) {
          for (let r = 0; r <= 1; r++) {
            let twsData = twsDatas[twsIdx];
            if (twsData.draw[r]) {
              twsData.paths[r].moveTo(0, 0);
              ctx.strokeStyle = this.twsContourColor[twsIdx];
              for (let i = minWrap; i <= maxWrap; i++) {
                const offset = (i - baseWrap) * wrapOffset;
                this.drawContour(ctx, twsData.paths[r], offset, i,
                                  minWrap, maxWrap, wrapOffset);
              }
            }
          }
        }
      }
    },
    drawContour(ctx, path, offset, i, minWrap, maxWrap, wrapOffset) {
      if (i === minWrap) {
        ctx.translate(offset, 0);
      }
      ctx.stroke(path);
      /* Last one undoes all wraps, otherwise step one wrap */
      ctx.translate(i === maxWrap ? -offset : wrapOffset, 0);
    },
  },
  render () {
    return null;
  },
}
</script>
