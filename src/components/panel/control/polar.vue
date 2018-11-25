<template>
  <div v-if="this.$store.state.boat.polar.loaded">
    <div id="bg">
      <canvas id="labels" ref="labels"/>
      <div id="polar">
        <canvas id="polarbg" ref="polarbg"/>
        <canvas id="polarfg" ref="polarfg"/>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { degToRad } from '../../../lib/utils.js';
import {MS_TO_KNT, windToColor} from '../../../lib/sol.js';

export default {
  name: 'ControlSteeringPolar',
  data () {
    return {
      curves: [3, 6, 9, 12, 15, 20, 25, 30],
      interval: 1,

      margins: 2 * 20,
      /* 105% of the real max speed to give a small breathing room for the curves */
      polarHeadroom: 1.05,
      gridMinSpacing: 20,

      setupDone: false,
    }
  },
  computed: {
    bgCurves () {
      let res = [];
      for (let knots of this.curves) {
        res.push(this.$store.getters['boat/polar/curve'](knots, this.interval));
      }
      return res;
    },
    fgCurve () {
      const knots = this.$store.state.boat.instruments.tws.value * MS_TO_KNT;
      return this.$store.getters['boat/polar/curve'](knots, this.interval);
    },
    maxSpeed () {
      return Math.max(...this.bgCurves.map(c => c.maxspeed.speed), 0) * this.polarHeadroom;
    },
    maxWidth () {
      return this.$refs.labels.width - this.margins;
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
      const maxVmgUp = Math.max(...this.bgCurves.map(c => c.maxvmg.up.vmg), 0);
      return Math.ceil(maxVmgUp * this.gridScale * this.polarHeadroom);
    },
    gridSize () {
      return {
        x: this.gridMaxKnots * this.gridScale,
        y: this.gridOrigoY + this.gridMaxKnots * this.gridScale,
      };
    },
    topBorderWidth () {
      return Math.sqrt(Math.pow(this.gridMaxKnots * this.gridScale, 2) -
                       Math.pow(this.gridOrigoY, 2));
    },

    /* Deps access to trigger redraw correctly */
    bgNeedRedraw () {
      if (!this.setupDone) {
        return -1;
      }
      this.bgCurves;
      this.gridSize;

      return Date.now();
    },
    fgNeedRedraw () {
      if (!this.setupDone) {
        return -1;
      }
      this.fgCurve;
      this.gridSize;
      this.boatTime;

      return Date.now();
    },
    ...mapGetters({
      boatTime: 'boat/time',
    }),
  },
  methods: {
    drawBg () {
      this.$refs.polarbg.width = this.gridSize.x;
      this.$refs.polarbg.height = this.gridSize.y;

      let ctx = this.$refs.polarbg.getContext('2d');
      ctx.save();

      this.drawGrid(ctx);
      for (let curve of this.bgCurves) {
        ctx.strokeStyle = windToColor(curve.knots);
        ctx.lineWidth = 2;
        this.drawCurve(ctx, curve);
      }
      ctx.restore();

      this.$refs.polarfg.width = this.gridSize.x;
      this.$refs.polarfg.height = this.gridSize.y;

      this.drawFg();
    },
    drawFg () {
      let ctx = this.$refs.polarfg.getContext('2d');
      ctx.clearRect(0, 0, this.$refs.polarfg.width, this.$refs.polarfg.height);
      ctx.save();
      ctx.translate(0, this.gridOrigoY);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      this.drawCurve(ctx, this.fgCurve);

      const twa = Math.abs(this.$store.state.boat.instruments.twa.value);
      let twsMod = this.$store.state.boat.instruments.tws.value;
      twsMod *= this.$store.state.boat.instruments.perf.value;
      const x = Math.sin(twa) * twsMod * this.gridScale;
      const y = -Math.cos(twa) * twsMod * this.gridScale;

      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.restore();
    },
    /* WARNING side-effect: translates context to polar origo */
    drawGrid (ctx) {
      ctx.strokeStyle = '#aaa';
      ctx.strokeWidth = 1;

      ctx.beginPath();
      ctx.moveTo(0, this.gridSize.y);
      ctx.lineTo(0, 0);
      ctx.lineTo(this.topBorderWidth, 0);
      ctx.stroke();

      ctx.translate(0, this.gridOrigoY);

      ctx.beginPath();
      for (let twad = 20; twad <= 180; twad += 10) {
        const twa = degToRad(twad);
        const x = Math.sin(twa) * this.gridMaxKnots * this.gridScale;
        const y = -Math.cos(twa) * this.gridMaxKnots * this.gridScale;
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      let i = 1;
      while (i * this.gridIntervalKnots <= this.gridMaxKnots) {
        ctx.arc(0, 0, i * this.gridIntervalKnots * this.gridScale,
                1.5 * Math.PI, 0.5 * Math.PI);
        i++;
      }
      ctx.stroke();
    },
    drawCurve(ctx, curve) {
      ctx.beginPath();
      let first = true;
      for (let pt of curve.values) {
        const x = Math.sin(pt.twa) * pt.speed * this.gridScale;
        const y = -Math.cos(pt.twa) * pt.speed * this.gridScale;
        first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        first = false;
      }
      ctx.stroke();
    },
  },
  watch: {
    fgNeedRedraw () {
      if (this.setupDone) {
        this.drawFg();
      }
    },
    bgNeedRedraw () {
      if (this.setupDone) {
        this.drawBg();
      }
    },
  },
  mounted () {
    this.setupDone = true;
    this.drawBg();
  }
}
</script>

<style scoped>
#bg {
  position: absolute;
  width: 100%;
}
#polar {
  position: relative;
  top: 20px;
  left: 20px;
}
#polarbg, #polarfg, #labels {
  position: absolute;
  top: 0px;
  left: 0px;
}
</style>
