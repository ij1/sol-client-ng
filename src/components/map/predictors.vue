<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { degToRad, hToMsec, minToMsec, secToMsec, interpolateFactor, linearInterpolate } from '../../lib/utils.js';
import { cogTwdToTwa, twaTwdToCog } from '../../lib/nav.js';
import { PERF_RECOVERY_MULT } from '../../lib/sol.js';

export default {
  name: 'SteeringPredictors',
  data () {
    return { 
      time: 0,
      // ADDME: support 10s for the first 10 minutes
      timeDelta: secToMsec(30),

      hourRadius: 3,
      quarterRadius: 2,
      first15minRadius: 1,
      plottedDelayRadius: 5,
      otherDelayRadius: 2,

      cog: {
        time: 0,
        cog: 0,
        firstLatLng: null,
        latLngs: [],
      },
      twa: {
        time: 0,
        twa: 0,
        firstLatLng: null,
        latLngs: [],
      },
    }
  },

  computed: {
    predictorLen () {
      return parseInt(this.cfgPredictorLen);
    },
    inactiveColor () {
      const rgba = this.commandBoatColor.match(/[0-9a-fA-F]{2}/g);
      return 'rgba(' +
             (parseInt(rgba[0], 16) / 2).toFixed() + ',' +
             (parseInt(rgba[1], 16) / 2).toFixed() + ',' +
             (parseInt(rgba[2], 16) / 2).toFixed() + ',' +
             (rgba.length < 4 ? '0.7' :
              Math.min(parseInt(rgba[3], 16) / 255.0 * 0.75, 0.7)) + ')';
    },
    viewOrigo () {
      this.viewUpdateStamp;

      return this.$parent.map.getPixelBounds().getTopLeft().round();
    },
    boatOrigo () {
      const z = this.zoom;

      if (this.visualPosition === null) {
        return this.viewOrigo;
      }
      return this.$parent.map.project(this.visualPosition, z).round();
    },
    timeOrigo () {
      return this.boatTime;
    },
    hourIndexes () {
      let res = [];
      for (let i = 0; i <= this.predictorLen; i++) {
        res.push(Math.floor(hToMsec(i) / this.timeDelta));
      }
      return res;
    },
    quarterIndexes () {
      let res = [];
      for (let i = 1; i < 4 * this.predictorLen; i++) {
        if ((i % 4) === 0) {
          continue;
        }
        res.push(Math.floor(minToMsec(15) * i / this.timeDelta));
      }
      return res;
    },
    first15minIndexes () {
      let res = [];
      for (let i = 1; i <= 14; i++) {
        res.push(Math.floor(minToMsec(1) * i / this.timeDelta));
      }
      return res;
    },
    cogPath () {
      this.cog.time;

      let p = new Path2D();
      if (this.cog.firstLatLng === null) {
        return p;
      }
      const z = this.zoom;

      p.moveTo(0, 0);
      let tmp = this.$parent.map.project(this.cog.latLngs[this.cog.latLngs.length - 1], z).round().subtract(this.boatOrigo);
      p.lineTo(tmp.x, tmp.y);

      return p;
    },
    twaPath () {
      this.twa.time;

      return this.precalcPath(this.twa.firstLatLng,
                              this.twa.latLngs);
    },
    hoursMarkers () {
      return this.getMarkers(this.hourIndexes);
    },
    quarterMarkers () {
      return this.getMarkers(this.quarterIndexes);
    },
    first15minMarkers () {
      return this.getMarkers(this.first15minIndexes);
    },
    dotDelay () {
      if (this.raceLoaded && this.isTowbackPeriod &&
          (this.plottedDcDelay !== null)) {
        const startDelta = Math.max(this.raceStartTime - this.boatTime, 0);
        if (hToMsec(this.plottedDcDelay) < startDelta) {
          return null;
        }
      }
      return this.plottedDcDelay;
    },
    predictorMarkers () {
      const time = this.dotDelay;
      if ((time === null) ||
          (time > this.predictorLen) ||
          (this.cog.firstLatLng === null) ||
          (this.twa.firstLatLng === null)) {
        return [];
      } else {
        const msecDot = hToMsec(time);
        const idx = msecDot / this.timeDelta;
        const lowIdx = Math.floor(idx);
        let markers = this.getMarkers([lowIdx]);
        if (time < this.predictorLen) {
          const highMarkers = this.getMarkers([lowIdx + 1]);
          const frac = interpolateFactor(lowIdx, idx, lowIdx + 1);

          /* Assumes the same order (twa & cc) */
          for (let m = 0; m < markers.length; m++) {
            for (let n of highMarkers) {
              if (markers[m].type === n.type) {
                markers[m].time = msecDot;
                markers[m].latLng = L.latLng(linearInterpolate(frac,
                                               markers[m].latLng.lat,
                                               n.latLng.lat),
                                             linearInterpolate(frac,
                                               markers[m].latLng.lng,
                                               n.latLng.lng));
                break;
              }
            }
          }
        }
        return markers;
      }
    },

    needsRedraw() {
      this.cog;
      this.twa;
      this.wxUpdated;
      this.dotDelay;
      this.cfgPredictors;
      this.predictorLen;
      this.commandBoatColor;
      this.isDark;

      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    boatDataUpdated () {
      this.boatTime;
      this.visualPosition;
      return Date.now();
    },
    ...mapGetters({
      wxValid: 'weather/valid',
      boatTime: 'boat/time',
      visualPosition: 'boat/visualPosition',
      isTowbackPeriod: 'race/isTowbackPeriod',
      allowControl: 'boat/allowControl',
      isDark: 'ui/isDark',
    }),
    ...mapState({
      boatId: state => state.boat.id,
      wxUpdated: state => state.weather.data.updated,
      raceLoaded: state => state.race.loaded,
      raceStartTime: state => state.race.info.startTime,
      currentSteering: state => state.boat.currentSteering,
      boatCog: state => state.boat.instruments.course.value,
      boatTwa: state => state.boat.instruments.twa.value,
      boatPerf: state => state.boat.instruments.perf.value,
      plottedDcDelay: state => state.boat.steering.plottedSteering.delayTime,
      viewUpdateStamp: state => state.map.viewUpdateStamp,
      zoom: state => state.map.zoom,
      cfgPredictors: state => state.boat.steering.cfg.predictors.value,
      cfgExtraUiDebug: state => state.diagnostics.cfg.extraUiDebug.value,
      cfgPredictorLen: state => state.boat.steering.cfg.predictorLen.value,
      commandBoatColor: state => state.map.cfg.commandBoatColor.value,
    }),
  },
  methods: {
    isEnabled (predictor) {
      if (!this.allowControl) {
        return false;
      }
      if (this.currentSteering === predictor) {
        return this.cfgPredictors !== 'none';
      }
      return this.cfgPredictors === 'both';
    },
    predictorColor (predictor) {
      return this.currentSteering === predictor ?
             this.commandBoatColor : this.inactiveColor;
    },
    redraw (ctx, ctx2) {
      this.__redraw(!this.isDark ? ctx : ctx2);
    },
    __redraw (ctx) {
      const z = this.zoom;

      // ADDME: add mixing to do all world copies and loop then here
      ctx.translate(this.boatOrigo.x - this.viewOrigo.x,
                    this.boatOrigo.y - this.viewOrigo.y);
      if (this.isEnabled('cc')) {
        ctx.strokeStyle = this.predictorColor('cc');
        ctx.stroke(this.cogPath);
      }
      if (this.isEnabled('twa')) {
        ctx.strokeStyle = this.predictorColor('twa');
        ctx.stroke(this.twaPath);
      }

      for (let pt of this.hoursMarkers) {
        if (!this.isEnabled(pt.type)) {
          continue;
        }
        let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
        ctx.strokeStyle = this.predictorColor(pt.type);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(tmp.x, tmp.y, this.hourRadius, 0, Math.PI*2);
        ctx.stroke();

        if (this.predictorLen > 6) {
          /* Draw solid circle every 6 hours */
          let inHours = pt.time / hToMsec(6);
          if (Math.abs(inHours - Math.floor(inHours)) < 0.001) {
            ctx.fill();
          }
        }
      }

      for (let pt of this.quarterMarkers) {
        if (!this.isEnabled(pt.type)) {
          continue;
        }
        let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
        ctx.fillStyle = this.predictorColor(pt.type);
        ctx.beginPath();
        ctx.arc(tmp.x, tmp.y, this.quarterRadius, 0, Math.PI*2);
        ctx.fill();
      }
      for (let pt of this.first15minMarkers) {
        if (!this.isEnabled(pt.type) || (this.zoom < 12)) {
          continue;
        }
        let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
        ctx.strokeStyle = this.predictorColor(pt.type);
        ctx.beginPath();
        ctx.arc(tmp.x, tmp.y, this.first15minRadius, 0, Math.PI*2);
        ctx.stroke();
      }
      for (let pt of this.predictorMarkers) {
        if (!this.isEnabled(pt.type)) {
          continue;
        }
        if (this.cfgExtraUiDebug) {
          this.$store.dispatch('diagnostics/add', 'predictor: dot (' +
                                                  pt.type + ') redraw to ' +
                                                  pt.latLng.lat + ' ' + pt.latLng.lng);
        }
        let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        const radius = (this.currentSteering === pt.type) ?
                       this.plottedDelayRadius : this.otherDelayRadius;
        ctx.arc(tmp.x, tmp.y, radius, 0, Math.PI*2);
        ctx.fill();
      }
    },
    precalcPath(firstPt, otherPts) {
      let p = new Path2D();

      if (firstPt === null) {
        return p;
      }

      const z = this.zoom;
      p.moveTo(0, 0);
      for (let pt of otherPts) {
        let tmp = this.$parent.map.project(pt, z).round().subtract(this.boatOrigo);
        p.lineTo(tmp.x, tmp.y);
      }
      return p;
    },

    consumeTowback (latLngs, pos, t) {
      while (t <= this.raceStartTime - this.timeDelta) {
        latLngs.push(pos);
        t += this.timeDelta;
      }
      return t;
    },
    /* When starting, part of the predictor belongs to towback and other
     * part is after race start, this function calculates the fraction
     * of the full movement the boat is already racing.
     *
     * Note: the DC dot interpolation won't be accurate for the first
     * predictor segment but that's < 30s from start so it shouldn't
     * matter.
     */
    moveFractionAfterTowback (t) {
      let firstStep = 1.0 - ((this.raceStartTime - t) / this.timeDelta);
      /* These safety bounds should be unncessary */
      return Math.max(Math.min(firstStep, 1), 0);
    },
    cogCalc () {
      let t = this.timeOrigo;
      const endTime = t + hToMsec(this.predictorLen);
      let lastLatLng = this.visualPosition;

      let cogPred = {
        time: t,
        cog: this.boatCog,
        firstLatLng: lastLatLng,
        latLngs: [],
      };

      if (!this.wxValid) {
        cogPred.firstLatLng = null;
        return cogPred;
      }
      cogPred.latLngs.push(Object.freeze(lastLatLng));

      const delta = (this.timeDelta/1000 / 3600) / 60;  /* m/s -> nm -> deg (in deg) */
      let perf = this.boatPerf;
      let firstStep = 1;

      if (this.isTowbackPeriod) {
        t = this.consumeTowback(cogPred.latLngs, lastLatLng, t);
        perf = 1.0;
        firstStep = this.moveFractionAfterTowback(t);
      }

      while (t < endTime) {
        const wind = this.$store.getters['weather/latLngWind'](lastLatLng, t);
        if (wind === null) {
          break;
        }
        const twa = cogTwdToTwa(cogPred.cog, wind.twd);
        const speed = this.$store.getters['boat/polar/getSpeed'](wind.ms, twa) *
                      perf * firstStep;
        firstStep = 1;

        const lonScaling = Math.abs(Math.cos(degToRad(lastLatLng.lat)));
        const dlon = delta * speed * Math.sin(cogPred.cog) / lonScaling;
        const dlat = delta * speed * Math.cos(cogPred.cog);

        lastLatLng = L.latLng(lastLatLng.lat + dlat,
                              lastLatLng.lng + dlon);
        cogPred.latLngs.push(Object.freeze(lastLatLng));
        t += this.timeDelta;
        perf = Math.min(perf +
                        PERF_RECOVERY_MULT * this.timeDelta / Math.abs(speed),
                        1.0);
      }
      Object.freeze(cogPred.latLngs);
      return cogPred;
    },

    twaCalc () {
      let t = this.timeOrigo;
      const endTime = t + hToMsec(this.predictorLen);
      let lastLatLng = this.visualPosition;

      let twaPred = {
        time: t,
        twa: this.boatTwa,
        firstLatLng: lastLatLng,
        latLngs: [],
      };

      if (!this.wxValid) {
        twaPred.firstLatLng = null;
        return twaPred;
      }
      twaPred.latLngs.push(Object.freeze(lastLatLng));

      const delta = (this.timeDelta/1000 / 3600) / 60;  /* m/s -> nm -> deg (in deg) */
      let perf = this.boatPerf;
      let firstStep = 1;

      if (this.isTowbackPeriod) {
        t = this.consumeTowback(twaPred.latLngs, lastLatLng, t);
        perf = 1.0;
        firstStep = this.moveFractionAfterTowback(t);
      }

      while (t < endTime) {
        const wind = this.$store.getters['weather/latLngWind'](lastLatLng, t);
        if (wind === null) {
          break;
        }
        const speed = this.$store.getters['boat/polar/getSpeed'](wind.ms, twaPred.twa) *
                      perf * firstStep;
        firstStep = 1;

        const course = twaTwdToCog(twaPred.twa, wind.twd);
        const lonScaling = Math.abs(Math.cos(degToRad(lastLatLng.lat)));
        const dlon = delta * speed * Math.sin(course) / lonScaling;
        const dlat = delta * speed * Math.cos(course);

        lastLatLng = L.latLng(lastLatLng.lat + dlat,
                              lastLatLng.lng + dlon);
        twaPred.latLngs.push(Object.freeze(lastLatLng));
        t += this.timeDelta;
        perf = Math.min(perf +
                        PERF_RECOVERY_MULT * this.timeDelta / Math.abs(speed),
                        1.0);
      }
      Object.freeze(twaPred.latLngs);

      return twaPred;
    },

    getMarkers (indexes) {
      this.twa.time;

      if ((this.cog.firstLatLng === null) ||
          (this.twa.firstLatLng === null)) {
        return [];
      }
      let res = [];
      for (let i of indexes) {
        if (i < this.twa.latLngs.length) {
          res.push({
            type: 'twa',
            time: i * this.timeDelta,
            latLng: this.twa.latLngs[i],
          });
        }
        if (i < this.cog.latLngs.length) {
          res.push({
            type: 'cc',
            time: i * this.timeDelta,
            latLng: this.cog.latLngs[i],
          });
        }
      }
      return res;
    },
    recalc () {
      if (this.boatId === null) {
        return;
      }
      this.cog = this.cogCalc();
      this.twa = this.twaCalc();
    },
  },
  mounted () {
    this.recalc();
  },
  watch: {
    boatDataUpdated () {
      this.recalc();
    },
    wxUpdated () {
      this.recalc();
    },
    predictorLen () {
      this.recalc();
    },
    predictorMarkers (newVal) {
      if (this.cfgExtraUiDebug) {
        this.$store.dispatch('diagnostics/add', 'predictor: dot watch ' + newVal.length + ' ' + this.dotDelay);
      }
      for (let pt of newVal) {
        if (this.currentSteering === pt.type) {
          this.$store.commit('boat/steering/setDelayLatLng', pt.latLng);
          return;
        }
      }
      this.$store.commit('boat/steering/setDelayLatLng', null);
    },
  },
  render () {
    return null;
  },
}
</script>
