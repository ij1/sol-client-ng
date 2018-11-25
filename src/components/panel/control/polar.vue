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
      return Math.ceil(this.maxSpeed / (this.maxWidth / 20));
    },
    gridIntervalPixels () {
      return Math.floor(this.maxWidth / Math.ceil(this.maxSpeed / this.gridIntervalKnots));
    },
    gridMaxKnots () {
      return Math.floor(this.maxWidth / this.gridIntervalPixels)
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
        x: this.gridMaxKnots * this.gridIntervalPixels,
        y: this.gridOrigoY + this.gridMaxKnots * this.gridIntervalPixels,
      };
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
      this.$store.state.boat.instruments.twa.value;
      this.$store.state.boat.instruments.perf.value;

      return Date.now();
    },
  },
  methods: {
    drawBg () {
      this.$refs.polarbg.width = this.gridSize.x;
      this.$refs.polarbg.height = this.gridSize.y;

      let ctx = this.$refs.polarbg.getContext('2d');
      ctx.save();
      ctx.strokeStyle = '#aaa';

      ctx.beginPath();
      ctx.moveTo(0, this.gridSize.y);
      ctx.lineTo(0, 0);
      const xBorderEnd = Math.sqrt(Math.pow(this.gridMaxKnots * this.gridScale, 2) -
                                   Math.pow(this.gridOrigoY, 2));
      ctx.lineTo(xBorderEnd, 0);
      ctx.stroke();

      ctx.translate(0, this.gridOrigoY);
      let i = 1;
      while (i * this.gridIntervalKnots <= this.gridMaxKnots) {
        ctx.beginPath();
        ctx.arc(0, 0, i * this.gridScale, 1.5 * Math.PI, 0.5 * Math.PI);
        ctx.stroke();
        i++;
      }

      for (let curve of this.bgCurves) {
        ctx.strokeStyle = windToColor(curve.knots);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let pt of curve.values) {
          ctx.lineTo(Math.sin(pt.twa) * pt.speed * this.gridScale,
                     -Math.cos(pt.twa) * pt.speed * this.gridScale);
        }
        ctx.stroke();
      }
      ctx.restore();

      this.$refs.polarfg.width = this.gridSize.x;
      this.$refs.polarfg.height = this.gridSize.y;

      this.drawFg();
    },
    drawFg () {

    },
  },
  mounted () {
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
