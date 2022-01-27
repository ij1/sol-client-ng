<template>
  <div id="polar" ref="polar-container">
    <canvas id="labels" ref="labels"/>
    <canvas class = "polar-draw-area" ref="polargrid"/>
    <canvas class = "polar-draw-area polarbg" ref = "polarbg"/>
    <canvas class = "polar-draw-area" ref="polarfg"/>
    <canvas
      class = "polar-draw-area"
      ref = "polaroverlay"
      @mousemove = "onMouseMove"
      @mouseout = "onMouseOut"
    />
    <div id = "wind-key-container" :style="{top: windKeyY + 'px'}">
      <wind-key/>
    </div>
    <div class = "polar-details">
      <div v-if = "hover.sog !== null">
        SOG: {{ roundToFixed(hover.sog, 2) }}
        VMG: {{ roundToFixed(hover.vmg, 2) }}
        <!-- hover.twa is text-formatted already as sign is different for
             polar hover & visual steer information
        -->
        TWA: {{ hover.twa }}
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import { mapState, mapGetters } from 'vuex';
import { degToRad, radToDeg, bsearchLeft } from '../../../lib/utils.js';
import { roundToFixed, canvasAlignToPixelCenter } from '../../../lib/quirks.js';
import { windToColor, MS_TO_KNT } from '../../../lib/sol.js';
import { speedTowardsBearing, atan2Bearing, twaTextPrefix } from '../../../lib/nav.js';
import { getSpeed } from '../../../store/modules/polar.js';
import { polarMixin } from '../../mixins/polar.js';
import WindKey from './windkey.vue';

export default {
  name: 'PolarGraph',
  components: {
    'wind-key': WindKey,
  },
  mixins: [polarMixin],
  props: {
    polarSizeLimit: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      margin: 22,
      /* 105% of the real max speed to give a small breathing room for the curves */
      polarHeadroom: 1.05,
      gridMinSpacing: 20,

      hover: {
        sog: null,
        vmg: null,
        twa: null,
      },

      fgAnimFrame: null,
      overlayAnimFrame: null,
    }
  },
  computed: {
    maxWidth () {
      const yScale = Math.max(this.polarSizeLimit.maxHeight - this.margin * 2, 40) /
                     (this.maxSpeed * this.polarHeadroom +
                      this.maxVmgUp * this.polarHeadroom);
      const xScale = Math.max(this.polarSizeLimit.maxWidth - this.margin * 2, 40) /
                     (this.maxSpeed * this.polarHeadroom);
      const maxScale = xScale < yScale ? 1 : yScale / xScale;

      return Math.max(maxScale * this.polarSizeLimit.maxWidth - this.margin * 2,
                      180);
    },

    scaleCurveIdx () {
      return Math.min(bsearchLeft(this.windKeys, this.boatTws * MS_TO_KNT) + 1,
                      this.windKeys.length - 1);
    },
    scaleCurves () {
      if (this.polarCurveMode === 'auto') {
        return this.bgCurves.slice(0, this.scaleCurveIdx + 1);
      }
      return this.bgCurves;
    },
    maxSpeed () {
      return Math.max(...this.scaleCurves.map(c => c.maxspeed.speed), 1) * this.polarHeadroom;
    },
    maxVmgUp () {
      return Math.max(...this.scaleCurves.map(c => c.maxvmg.up.vmg), 1);
    },
    gridIntervalKnots () {
      return Math.ceil(this.maxSpeed / (this.maxWidth / this.gridMinSpacing));
    },
    gridIntervalPixels () {
      return Math.floor(this.maxWidth / Math.ceil(this.maxSpeed / this.gridIntervalKnots));
    },
    gridMaxKnots () {
      return Math.floor(this.maxWidth / this.gridIntervalPixels) * this.gridIntervalKnots;
    },
    gridScale () {
      return this.gridIntervalPixels / this.gridIntervalKnots;
    },
    gridOrigoY () {
      return Math.ceil(this.maxVmgUp * this.gridScale * this.polarHeadroom);
    },
    gridSize () {
      return {
        x: this.gridMaxKnots * this.gridScale + 1,
        y: this.gridOrigoY + this.gridMaxKnots * this.gridScale + 1,
      };
    },
    firstTwaDeg () {
      return this.gridOrigoY / this.gridSize.y < 0.75 ? 20 : 10;
    },
    topBorderWidth () {
      return Math.sqrt(Math.pow(this.gridMaxKnots * this.gridScale, 2) -
                       Math.pow(this.gridOrigoY, 2));
    },
    topBorderTwa () {
      return Math.acos(this.gridOrigoY / (this.gridMaxKnots * this.gridScale));
    },
    windKeyY () {
      let toAngle = 125;
      if (this.polarSizeLimit.maxWidth < 280) {
        toAngle += (280 - this.polarSizeLimit.maxWidth) * 10 / (160.0 - 125.0);
      }
      return this.polarCoords(degToRad(toAngle), this.gridMaxKnots,
                              this.gridScale, 5).y + 10 +
             this.gridOrigoY + this.margin;
    },
    sortedCurves () {
      if (this.boatTws === null) {
        return this.bgCurves;
      }

      return [].concat(this.bgCurves).sort((a, b) => {
        return Math.abs(this.boatTws - b.ms) -
               Math.abs(this.boatTws - a.ms);
      });
    },
    /* For reduced dependency tracking to avoid unnecessary reloads */
    firstCurveKnots () {
      return this.sortedCurves[this.sortedCurves.length - 1].knots;
    },

    /* Deps access to trigger redraw correctly */
    bgNeedRedraw () {
      this.bgCurves;
      this.firstCurveKnots;
      this.scaleCurves;
      this.gridSize;

      return Date.now();
    },
    fgNeedRedraw () {
      this.fgCurve;
      this.gridSize;
      this.boatTime;

      return Date.now();
    },
    overlayNeedRedraw () {
      this.visualSteeringTwa;

      return Date.now();
    },
    dayNight () {
      return this.configDayNight === 'dark' ? this.configDayNight : 'white';
    },
    ...mapState({
      boatSpeed: state => state.boat.instruments.speed.value,
      boatTwa: state => state.boat.instruments.twa.value,
      boatTws: state => state.boat.instruments.tws.value,
      visualSteeringTwa: state => state.boat.steering.visualSteering.twa,
      polarCurveMode: state => state.boat.polar.polarMode,
      configDayNight: state => state.ui.cfg.dayNightMode.value,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
      bgCurves: 'boat/polar/staticCurves',
      fgCurve: 'boat/polar/currentCurve',
      windKeys: 'boat/polar/windKeys',
    }),
  },
  methods: {
    draw () {
      this.$refs.polargrid.width = this.gridSize.x;
      this.$refs.polargrid.height = this.gridSize.y;
      this.$refs.polarbg.width = this.gridSize.x;
      this.$refs.polarbg.height = this.gridSize.y;
      this.$refs.labels.width = this.gridSize.x + this.margin * 2;
      this.$refs.labels.height = this.gridSize.y + this.margin * 2;

      let gridctx = this.$refs.polargrid.getContext('2d');
      let curvectx = this.$refs.polarbg.getContext('2d');
      let labelctx = this.$refs.labels.getContext('2d');
      gridctx.save();
      curvectx.save();
      labelctx.save();
      canvasAlignToPixelCenter(gridctx);
      canvasAlignToPixelCenter(curvectx);
      canvasAlignToPixelCenter(labelctx);

      gridctx.translate(0, this.gridOrigoY);
      curvectx.translate(0, this.gridOrigoY);
      labelctx.translate(this.margin, this.gridOrigoY + this.margin);

      this.drawGrid(gridctx);
      this.drawLabels(labelctx);

      for (let curve of this.sortedCurves) {
        curvectx.strokeStyle = windToColor(curve.knots);
        curvectx.lineWidth = 2;
        this.drawPolarCurve(curvectx, curve, this.gridScale, this.gridMaxKnots);
      }
      gridctx.restore();
      curvectx.restore();
      labelctx.restore();

      this.$refs.polarfg.width = this.gridSize.x;
      this.$refs.polarfg.height = this.gridSize.y;
      this.$refs.polaroverlay.width = this.gridSize.x;
      this.$refs.polaroverlay.height = this.gridSize.y;

      this._drawFg();
    },
    drawFg () {
      this.fgAnimFrame = null;
      this._drawFg();
    },
    _drawFg () {
      let ctx = this.$refs.polarfg.getContext('2d');
      ctx.clearRect(0, 0, this.$refs.polarfg.width, this.$refs.polarfg.height);
      ctx.save();
      canvasAlignToPixelCenter(ctx);
      ctx.translate(0, this.gridOrigoY);
      ctx.strokeStyle = this.dayNight === 'white' ? '#000' : '#fff';
      ctx.lineWidth = 2;
      if (this.fgCurve !== null) {
        this.drawPolarCurve(ctx, this.fgCurve, this.gridScale, this.gridMaxKnots);
      }

      if ((this.boatTwa !== null) && (this.boatSpeed !== null)) {
        const twa = Math.abs(this.boatTwa);
        const speed = this.boatSpeed;
        const polarPos = this.polarCoords(twa, speed, this.gridScale);

        ctx.beginPath();
        ctx.arc(polarPos.x, polarPos.y, 2, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();

      this._drawOverlay();
    },
    drawOverlay () {
      this.overlayAnimFrame = null;
      this._drawOverlay();
    },
    _drawOverlay () {
      let twa = this.visualSteeringTwa;
      let ctx = this.$refs.polaroverlay.getContext('2d');
      ctx.clearRect(0, 0, this.$refs.polaroverlay.width, this.$refs.polaroverlay.height);
      if (twa === null) {
        return;
      }
      twa = Math.abs(twa);
      ctx.save();
      ctx.translate(0, this.gridOrigoY);
      const polarPos = this.polarCoords(twa, this.gridMaxKnots, this.gridScale);
      ctx.strokeStyle = this.dayNight === 'white' ? '#000' : '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(polarPos.x, polarPos.y);
      ctx.stroke();
      ctx.restore();
    },

    drawGrid (ctx) {
      ctx.lineWidth = 1;

      ctx.strokeStyle = '#aaa';
      ctx.beginPath();
      ctx.moveTo(0, this.gridSize.y - this.gridOrigoY);
      ctx.lineTo(0, -this.gridOrigoY);
      ctx.lineTo(this.topBorderWidth, -this.gridOrigoY);
      ctx.stroke();

      /* Apply gradient to the inner-most part of the line to keep a (near)
       * constant intensity look to eye, otherwise the contracting lines
       * look much darker than the rest of the grid.
       */
      let grad = ctx.createRadialGradient(0, 0, 0, 0, 0,
                           this.gridIntervalKnots * this.gridScale);
      if (this.dayNight === 'white') {
        grad.addColorStop(0, '#eee');
        grad.addColorStop(1, '#aaa');
      } else {
        grad.addColorStop(0, '#777');
        grad.addColorStop(1, '#aaa');
      }
      ctx.strokeStyle = grad;
      for (let twad = this.firstTwaDeg; twad <= 170; twad += 10) {
        const twa = degToRad(twad);
        const innerPolarPos = this.polarCoords(twa, this.gridIntervalKnots,
                                               this.gridScale);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(innerPolarPos.x, innerPolarPos.y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#aaa';
      ctx.beginPath();
      for (let twad = this.firstTwaDeg; twad <= 170; twad += 10) {
        const twa = degToRad(twad);
        const innerPolarPos = this.polarCoords(twa, this.gridIntervalKnots,
                                               this.gridScale);
        const outerPolarPos = this.polarCoords(twa, this.gridMaxKnots,
                                               this.gridScale);
        ctx.moveTo(innerPolarPos.x, innerPolarPos.y);
        ctx.lineTo(outerPolarPos.x, outerPolarPos.y);
      }
      ctx.stroke();

      let i = 1;
      while (i * this.gridIntervalKnots <= this.gridMaxKnots) {
        const r = i * this.gridIntervalKnots * this.gridScale;
        ctx.beginPath();
        ctx.arc(0, 0, r, 1.5 * Math.PI, 0.5 * Math.PI);
        ctx.stroke();
        i++;
      }
    },

    drawLabels (labelctx) {
      const col = this.dayNight === 'white' ? '#000' : '#fff';
      labelctx.strokeStyle = col;
      labelctx.fillStyle = col;
      labelctx.font = '10px sans-serif';

      for (let twad = this.firstTwaDeg; twad <= 170; twad += 10) {
        const twa = degToRad(twad);
        if (twa < this.topBorderTwa) {
          labelctx.textAlign = 'center';
          labelctx.textBaseline = 'bottom';
          labelctx.fillText(twad + "\xb0",
                            Math.tan(twa) * this.gridOrigoY +
                            this.polarCoords(twa, 0, this.gridScale, 7).x,
                            -this.gridOrigoY - 2);
        } else {
          labelctx.textAlign = 'left';
          labelctx.textBaseline = twad < 120 ? 'middle' : 'top';
          const labelPos = this.polarCoords(twa, this.gridMaxKnots,
                                            this.gridScale, 5);
          labelctx.fillText(twad + "\xb0",
                            labelPos.x - Math.max(twad - 90, 0)/10,
                            labelPos.y);
        }
      }

      labelctx.textAlign = 'end';
      labelctx.textBaseline = 'middle';
      labelctx.fillText('kn', -5, 0);
      let i = 1;
      while (i * this.gridIntervalKnots <= this.gridMaxKnots) {
        const r = i * this.gridIntervalKnots * this.gridScale;
        labelctx.fillText('' + (i * this.gridIntervalKnots), -5, r);
        if (r <= this.gridOrigoY) {
          labelctx.fillText('' + (i * this.gridIntervalKnots), -5, -r);
        }
        i++;
      }
    },

    clearHoverInfo () {
      this.hover.sog = null;
      this.hover.vmg = null;
      this.hover.twa = null;
    },
    onMouseMove (ev) {
      const pt = L.DomEvent.getMousePosition(ev, this.$refs.polaroverlay);
      const y = Math.floor(pt.y) - this.gridOrigoY;
      const x = Math.floor(pt.x);
      const sog = Math.hypot(x, y) / this.gridScale;
      if (sog > this.gridMaxKnots) {
        this.clearHoverInfo();
        return;
      }
      this.hover.sog = sog;
      this.hover.vmg = -y / this.gridScale;
      const twa = atan2Bearing(x, y);
      this.hover.twa = roundToFixed(radToDeg(twa), 1);
    },
    onMouseOut () {
      this.clearHoverInfo();
    },
    roundToFixed,
  },
  watch: {
    overlayNeedRedraw () {
      if ((this.fgAnimFrame === null) && (this.overlayAnimFrame === null)) {
        this.overlayAnimFrame = L.Util.requestAnimFrame(this.drawOverlay, this);
      }
    },
    fgNeedRedraw () {
      if (this.fgAnimFrame === null) {
        if (this.overlayAnimFrame !== null) {
          L.Util.cancelAnimFrame(this.overlayAnimFrame);
          this.overlayAnimFrame = null;
        }
        this.fgAnimFrame = L.Util.requestAnimFrame(this.drawFg, this);
      }
    },
    bgNeedRedraw () {
      this.draw();
    },
    boatTws(newVal, oldVal) {
      if (oldVal === null && newVal !== null) {
        this.draw();
      }
      for (const c of this.bgCurves) {
        if (Math.sign(c.ms - newVal) !== Math.sign(c.ms - oldVal)) {
          this.draw();
          return;
        }
      }
    },
    visualSteeringTwa (twaVal, oldVal) {
      if (twaVal !== null) {
        this.hover.twa = twaTextPrefix(twaVal) + roundToFixed(radToDeg(twaVal), 1);
        this.hover.sog = getSpeed(this.boatTws, twaVal);
        this.hover.vmg = speedTowardsBearing(this.hover.sog, twaVal, 0);
      } else if (oldVal !== null) {
        this.clearHoverInfo();
      }
    },
    maxWidth () {
      this.draw();
    },
  },
  mounted () {
    this.draw();
  },
  beforeDestroy () {
    if (this.fgAnimFrame != null) {
      L.Util.cancelAnimFrame(this.fgAnimFrame);
    }
    if (this.overlayAnimFrame != null) {
      L.Util.cancelAnimFrame(this.overlayAnimFrame);
    }
  },
}
</script>

<style scoped>
#polar {
  position: absolute;
  width: 100%;
}
#labels {
  position: relative;
}
.polar-draw-area {
  position: absolute;
  top: 20px;
  left: 20px;
  cursor: crosshair;
}
.polarbg {
  mix-blend-mode: multiply;
}
.control-panel-dark .polarbg {
  mix-blend-mode: screen;
}
.polar-details {
  font-size: 12px;
  min-height: 20px;
}
#wind-key-container {
  position: absolute;
  right: 10px;
}
</style>
