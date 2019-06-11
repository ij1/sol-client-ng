<template>
  <div id="polar" ref="polar-container">
    <canvas id="labels" ref="labels"/>
    <canvas id="polargrid" ref="polargrid"/>
    <canvas id="polarbg" ref="polarbg"/>
    <canvas id="polarfg" ref="polarfg"/>
    <canvas
      id = "polaroverlay"
      ref = "polaroverlay"
      @mousemove = "onMouseMove"
      @mouseout = "onMouseOut"
    />
    <div id = "wind-key-container" :style="{top: windKeyY + 'px'}">
      <wind-key/>
    </div>
    <div v-if = "hover.sog !== null">
      SOG: {{ roundToFixed(hover.sog, 2) }}
      VMG: {{ roundToFixed(hover.vmg, 2) }}
      TWA: {{ roundToFixed(hover.twa, 1) }}
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import { mapState, mapGetters } from 'vuex';
import { degToRad, radToDeg } from '../../../lib/utils.js';
import { roundToFixed, canvasAlignToPixelCenter } from '../../../lib/quirks.js';
import { windToColor } from '../../../lib/sol.js';
import { atan2Bearing } from '../../../lib/nav.js';
import { polarMixin } from '../../mixins/polar.js';
import WindKey from './windkey.vue';

export default {
  name: 'PolarGraph',
  components: {
    'wind-key': WindKey,
  },
  mixins: [polarMixin],
  data () {
    return {
      margin: 22,
      /* 105% of the real max speed to give a small breathing room for the curves */
      polarHeadroom: 1.05,
      gridMinSpacing: 20,
      /*
       * FIXME: only set in mounted(). Should listen resize or perhaps
       * use vue-resize?
       */
      maxWidth: 40,

      hover: {
        sog: null,
        vmg: null,
        twa: null,
      },

      animFrame: null,
    }
  },
  computed: {
    maxSpeed () {
      return Math.max(...this.bgCurves.map(c => c.maxspeed.speed), 1) * this.polarHeadroom;
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
      const maxVmgUp = Math.max(...this.bgCurves.map(c => c.maxvmg.up.vmg), 1);
      return Math.ceil(maxVmgUp * this.gridScale * this.polarHeadroom);
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
      return this.polarCoords(degToRad(125), this.gridMaxKnots,
                              this.gridScale, 5).y + 10 +
             this.gridOrigoY + this.margin;
    },

    /* Deps access to trigger redraw correctly */
    bgNeedRedraw () {
      this.bgCurves;
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
    ...mapState({
      boatSpeed: state => state.boat.instruments.speed.value,
      boatTwa: state => state.boat.instruments.twa.value,
      visualSteeringTwa: state => state.boat.steering.visualSteering.twa,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
      bgCurves: 'boat/polar/staticCurves',
      fgCurve: 'boat/polar/currentCurve',
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
      for (let curve of this.bgCurves) {
        curvectx.strokeStyle = windToColor(curve.knots);
        curvectx.lineWidth = 2;
        this.drawPolarCurve(curvectx, curve, this.gridScale);
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
      this.animFrame = null;
      this._drawFg();
    },
    _drawFg () {
      let ctx = this.$refs.polarfg.getContext('2d');
      ctx.clearRect(0, 0, this.$refs.polarfg.width, this.$refs.polarfg.height);
      ctx.save();
      canvasAlignToPixelCenter(ctx);
      ctx.translate(0, this.gridOrigoY);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      this.drawPolarCurve(ctx, this.fgCurve, this.gridScale);

      const twa = Math.abs(this.boatTwa);
      const speed = this.boatSpeed;
      const polarPos = this.polarCoords(twa, speed, this.gridScale);

      ctx.beginPath();
      ctx.arc(polarPos.x, polarPos.y, 2, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.restore();

      this.drawOverlay();
    },
    drawOverlay () {
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
      ctx.strokeStyle = '#000';
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
      grad.addColorStop(0, '#eee');
      grad.addColorStop(1, '#aaa');
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
      labelctx.strokeStyle = '#000';
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
      this.hover.twa = radToDeg(atan2Bearing(x, y));
    },
    onMouseOut () {
      this.clearHoverInfo();
    },
    recalculateMaxWidth () {
      this.maxWidth = Math.max(this.$refs['polar-container'].clientWidth -
                               this.margin * 2,
                               180);
      this.draw();
    },
    onResize () {
      this.$nextTick(() => {
        this.recalculateMaxWidth();
      });
    },
    roundToFixed,
  },
  watch: {
    overlayNeedRedraw () {
      this.drawOverlay();
    },
    fgNeedRedraw () {
      if (this.animFrame === null) {
        this.animFrame = L.Util.requestAnimFrame(this.drawFg, this);
      }
    },
    bgNeedRedraw () {
      this.draw();
    },
  },
  mounted () {
    this.$nextTick(() => {
      window.addEventListener('resize', this.onResize);
      this.recalculateMaxWidth();
    });
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize);
    if (this.animFrame != null) {
      L.Util.cancelAnimFrame(this.animFrame);
    }
  },
}
</script>

<style scoped>
#polar, #labels {
  position: relative;
}
#polar-container {
  width: 100%;
}
#polargrid, #polarbg, #polarfg, #polaroverlay {
  position: absolute;
  top: 20px;
  left: 20px;
}
#polarbg {
  mix-blend-mode: multiply;
}
#wind-key-container {
  position: absolute;
  right: 2px;
}
</style>
