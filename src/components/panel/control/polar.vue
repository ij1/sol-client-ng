<template>
  <div id="polar">
    <canvas id="labels" ref="labels"/>
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
    <div v-if = "this.hover.sog !== null">
      SOG: {{ roundToFixed(this.hover.sog, 2) }}
      VMG: {{ roundToFixed(this.hover.vmg, 2) }}
      TWA: {{ roundToFixed(this.hover.twa, 1) }}
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import { mapGetters } from 'vuex';
import { degToRad, radToDeg } from '../../../lib/utils.js';
import { roundToFixed, canvasAlignToPixelCenter } from '../../../lib/quirks.js';
import {MS_TO_KNT, windToColor} from '../../../lib/sol.js';
import { atan2Bearing } from '../../../lib/nav.js';
import WindKey from './windkey.vue';

export default {
  name: 'PolarGraph',
  components: {
    'wind-key': WindKey,
  },
  data () {
    return {
      margin: 20,
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
    }
  },
  computed: {
    bgCurves () {
      return this.$store.getters['boat/polar/staticCurves'];
    },
    fgCurve () {
      const knots = this.$store.state.boat.instruments.tws.value * MS_TO_KNT;
      return this.$store.getters['boat/polar/curve'](knots, this.$store.state.boat.polar.twaInterval);
    },
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
    topBorderWidth () {
      return Math.sqrt(Math.pow(this.gridMaxKnots * this.gridScale, 2) -
                       Math.pow(this.gridOrigoY, 2));
    },
    topBorderTwa () {
      return Math.acos(this.gridOrigoY / (this.gridMaxKnots * this.gridScale));
    },
    windKeyY () {
      return this.polarCoords(degToRad(125), this.gridMaxKnots, 5).y + 10 +
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
      this.$store.state.boat.steering.visualSteering.twa;

      return Date.now();
    },
    ...mapGetters({
      boatTime: 'boat/time',
    }),
  },
  methods: {
    polarCoords (twa, speed, extraPixels = 0) {
      return {
        x: Math.sin(twa) * (speed * this.gridScale + extraPixels),
        y: -Math.cos(twa) * (speed * this.gridScale + extraPixels),
      };
    },
    draw () {
      this.$refs.polarbg.width = this.gridSize.x;
      this.$refs.polarbg.height = this.gridSize.y;
      this.$refs.labels.height = this.gridSize.y + this.margin * 2;

      let ctx = this.$refs.polarbg.getContext('2d');
      let labelctx = this.$refs.labels.getContext('2d');
      ctx.save();
      labelctx.save();
      canvasAlignToPixelCenter(ctx);
      canvasAlignToPixelCenter(labelctx);

      this.drawGrid(ctx, labelctx);
      for (let curve of this.bgCurves) {
        ctx.strokeStyle = windToColor(curve.knots);
        ctx.lineWidth = 2;
        this.drawPolarCurve(ctx, curve);
      }
      ctx.restore();
      labelctx.restore();

      this.$refs.polarfg.width = this.gridSize.x;
      this.$refs.polarfg.height = this.gridSize.y;
      this.$refs.polaroverlay.width = this.gridSize.x;
      this.$refs.polaroverlay.height = this.gridSize.y;

      this.drawFg();
    },
    drawFg () {
      let ctx = this.$refs.polarfg.getContext('2d');
      ctx.clearRect(0, 0, this.$refs.polarfg.width, this.$refs.polarfg.height);
      ctx.save();
      canvasAlignToPixelCenter(ctx);
      ctx.translate(0, this.gridOrigoY);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      this.drawPolarCurve(ctx, this.fgCurve);

      const twa = Math.abs(this.$store.state.boat.instruments.twa.value);
      const speed = this.$store.state.boat.instruments.speed.value;
      const polarPos = this.polarCoords(twa, speed);

      ctx.beginPath();
      ctx.arc(polarPos.x, polarPos.y, 2, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.restore();

      this.drawOverlay();
    },
    drawOverlay () {
      let twa = this.$store.state.boat.steering.visualSteering.twa;
      let ctx = this.$refs.polaroverlay.getContext('2d');
      ctx.clearRect(0, 0, this.$refs.polaroverlay.width, this.$refs.polaroverlay.height);
      if (twa === null) {
        return;
      }
      twa = Math.abs(twa);
      ctx.save();
      ctx.translate(0, this.gridOrigoY);
      const polarPos = this.polarCoords(twa, this.gridMaxKnots);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(polarPos.x, polarPos.y);
      ctx.stroke();
      ctx.restore();
    },
    /* WARNING side-effect: translates context to polar origo */
    drawGrid (ctx, labelctx) {
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1;
      labelctx.strokeStyle = '#000';
      labelctx.font = '10px sans-serif';

      ctx.beginPath();
      ctx.moveTo(0, this.gridSize.y);
      ctx.lineTo(0, 0);
      ctx.lineTo(this.topBorderWidth, 0);
      ctx.stroke();

      ctx.translate(0, this.gridOrigoY);
      labelctx.translate(this.margin, this.gridOrigoY + this.margin);

      ctx.beginPath();
      const firstTwad = this.gridOrigoY / this.gridSize.y < 0.75 ? 20 : 10;
      for (let twad = firstTwad; twad <= 170; twad += 10) {
        const twa = degToRad(twad);
        const polarPos = this.polarCoords(twa, this.gridMaxKnots);
        ctx.moveTo(0, 0);
        ctx.lineTo(polarPos.x, polarPos.y);
        if (twa < this.topBorderTwa) {
          labelctx.textAlign = 'center';
          labelctx.textBaseline = 'bottom';
          labelctx.fillText(twad + "\xb0",
                            Math.tan(twa) * this.gridOrigoY + this.polarCoords(twa, 0, 7).x,
                            -this.gridOrigoY - 2);
        } else {
          labelctx.textAlign = 'left';
          labelctx.textBaseline = twad < 120 ? 'middle' : 'top';
          const labelPos = this.polarCoords(twa, this.gridMaxKnots, 5);
          labelctx.fillText(twad + "\xb0",
                            labelPos.x - Math.max(twad - 90, 0)/10,
                            labelPos.y);
        }
      }
      ctx.stroke();

      labelctx.textAlign = 'end';
      labelctx.textBaseline = 'middle';
      labelctx.fillText('kn', -5, 0);
      ctx.beginPath();
      let i = 1;
      while (i * this.gridIntervalKnots <= this.gridMaxKnots) {
        const r = i * this.gridIntervalKnots * this.gridScale;
        ctx.arc(0, 0, r, 1.5 * Math.PI, 0.5 * Math.PI);
        labelctx.fillText('' + (i * this.gridIntervalKnots), -5, r);
        i++;
      }
      ctx.stroke();
    },
    drawPolarCurve(ctx, curve) {
      ctx.beginPath();
      let first = true;
      for (let pt of curve.values) {
        const polarPos = this.polarCoords(pt.twa, pt.speed);
        first ? ctx.moveTo(polarPos.x, polarPos.y) : ctx.lineTo(polarPos.x, polarPos.y);
        first = false;
      }
      ctx.stroke();
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
    roundToFixed,
  },
  watch: {
    overlayNeedRedraw () {
      this.drawOverlay();
    },
    fgNeedRedraw () {
      this.drawFg();
    },
    bgNeedRedraw () {
      this.draw();
    },
  },
  mounted () {
    this.maxWidth = this.$refs.labels.width - this.margin * 2;
    this.draw();
  }
}
</script>

<style scoped>
#polar, #labels {
  position: relative;
}
#polarbg, #polarfg, #polaroverlay {
  position: absolute;
  top: 20px;
  left: 20px;
}
#wind-key-container {
  position: absolute;
  right: 2px;
}
</style>
