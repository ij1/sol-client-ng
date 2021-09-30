<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { hToMsec, minToMsec, secToMsec, interpolateFactor, linearInterpolate, bsearchLeft } from '../../lib/utils.js';
import { cogPredictor, twaPredictor } from '../../lib/predictors.js';
import { predictorData } from '../../store/modules/steering.js';
import { cogTwdToTwa } from '../../lib/nav.js';
import { latLngWind } from '../../store/modules/weather.js';
import { getSpeed } from '../../store/modules/polar.js';

export default {
  name: 'SteeringPredictors',
  data () {
    return { 
      time: 0,
      wxValid: false,
      // ADDME: support 10s for the first 10 minutes
      timeDelta: secToMsec(30),

      halfLimit: 24,
      quarterLimit: 12,

      hourRadius: 3,
      quarterRadius: 2,
      first15minRadius: 1,
      plottedDelayRadius: 5,
      otherDelayRadius: 2,

      oldPathStamp: -1,

      predictorDefs: {
        'cog': {
          'calc': cogPredictor,
          'path': 'cogPath',
        },
        'twa': {
          'calc': twaPredictor,
          'path': 'precalcPath',
        },
        'dcPred': {
          'calc': this.dcPredCalc,
          'path': 'precalcPath',
        },
      },
      steerTypeToValue: {
        'cog': 'boatCog',
        'twa': 'boatTwa',
      },
    }
  },

  computed: {
    predictorLen () {
      return parseInt(this.cfgPredictorLen);
    },
    predictorLenMsec () {
      return hToMsec(this.predictorLen);
    },
    predictorList () {
      let res = [];
      if (!this.allowControl) {
        return res;
      }

      if (this.cfgPredictors === 'both') {
        res.push(this.currentSteering === 'cog' ? 'twa' : 'cog');
      }
      if (this.cfgPredictors !== 'none') {
        res.push(this.currentSteering);
      }
      if (this.cfgPredictorDcs) {
        res.push('dcPred');
      }
      return res;
    },
    activePredictor () {
      let fromPred = this.currentSteering;
      if (this.cfgPredictorDcs) {
        fromPred = 'dcPred';
      }
      return fromPred;
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
      return this.$parent.map.project(this.visualPosition, z)._round();
    },
    timeOrigo () {
      return this.boatTime;
    },
    hourMarkerMsecs () {
      let res = [];
      for (let i = 0; i <= this.predictorLen; i++) {
        res.push(hToMsec(i));
      }
      return res;
    },
    quarterMarkerMsecs () {
      let res = [];
      for (let i = 1; i < 4 * Math.min(this.predictorLen, this.halfLimit); i++) {
        if ((i % 4) === 0) {
          continue;
        }
        if ((i >= 4 * this.quarterLimit) && (i % 4) !== 2) {
          continue;
        }
        res.push(minToMsec(15) * i);
      }
      return res;
    },
    first15minMarkerMsecs () {
      let res = [];
      for (let i = 1; i <= 14; i++) {
        res.push(minToMsec(1) * i);
      }
      return res;
    },
    wxDelay () {
      if (!this.wxValid) {
        return null;
      }
      return this.wxTime - this.boatTime;
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
    markers () {
      this.predictorStamp;
      let res = {};

      for (let pred of this.predictorList) {
        res[pred] = {
          hour: [],
          quarter: [],
          first15min: [],
          dc: [],
          wx: [],
        };

        let marker;

        for (let h of this.hourMarkerMsecs) {
          marker = this.interpolateMarker(pred, h);
          if (marker !== null) {
            res[pred].hour.push(marker);
          }
        }
        for (let q of this.quarterMarkerMsecs) {
          marker = this.interpolateMarker(pred, q);
          if (marker !== null) {
            res[pred].quarter.push(marker);
          }
        }
        for (let f of this.first15minMarkerMsecs) {
          marker = this.interpolateMarker(pred, f);
          if (marker !== null) {
            res[pred].first15min.push(marker);
          }
        }
        if (this.dotDelay !== null) {
          marker = this.interpolateMarker(pred, hToMsec(this.dotDelay));
          if (marker !== null) {
            res[pred].dc.push(marker);
          }
        }
        if (this.wxDelay !== null && this.wxDelay > 0) {
          marker = this.interpolateMarker(pred, this.wxDelay);
          if (marker !== null) {
            res[pred].wx.push(marker);
          }
        }
      }
      return res;
    },
    currentSteering () {
      return this.currentSteeringApi === 'cc' ? 'cog' : this.currentSteeringApi;
    },

    pathsNeedRedraw() {
      this.predictorStamp;
      this.boatOrigo;
      this.zoom;

      return Date.now();
    },

    needsRedraw() {
      this.predictorStamp;
      this.wxDataStamp;
      this.dotDelay;
      this.wxDelay;
      this.predictorLen;
      this.commandBoatColor;
      this.isDark;

      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    boatDataUpdated () {
      this.boatTime;
      this.visualPosition;
      this.dcFetchTime;
      this.predictorList;

      return Date.now();
    },
    ...mapGetters({
      wxValidOrig: 'weather/valid',
      boatTime: 'boat/time',
      visualPosition: 'boat/visualPosition',
      isTowbackPeriod: 'race/isTowbackPeriod',
      allowControl: 'boat/allowControl',
      isDark: 'ui/isDark',
    }),
    ...mapState({
      boatId: state => state.boat.id,
      wxDataStamp: state => state.weather.dataStamp,
      wxTime: state => state.weather.time,
      wxLastTimestamp: state => state.weather.lastTimestamp,
      raceLoaded: state => state.race.loaded,
      raceStartTime: state => state.race.info.startTime,
      currentSteeringApi: state => state.boat.currentSteering,
      boatCog: state => state.boat.instruments.course.value,
      boatTwa: state => state.boat.instruments.twa.value,
      boatPerf: state => state.boat.instruments.perf.value,
      plottedDcDelay: state => state.boat.steering.plottedSteering.delayTime,
      dcFetchTime: state => state.boat.steering.dcs.fetchTime,
      predictorStamp: state => state.boat.steering.predictorStamp,
      viewUpdateStamp: state => state.map.viewUpdateStamp,
      zoom: state => state.map.zoom,
      cfgPredictors: state => state.boat.steering.cfg.predictors.value,
      cfgPredictorDcs: state => state.boat.steering.cfg.predictorDcs.value,
      cfgExtraUiDebug: state => state.diagnostics.cfg.extraUiDebug.value,
      cfgPredictorLen: state => state.boat.steering.cfg.predictorLen.value,
      commandBoatColor: state => state.map.cfg.commandBoatColor.value,
    }),
  },
  methods: {
    predictorColor (predictor) {
      if (this.cfgPredictorDcs) {
        return predictor === 'dcPred' ?
               this.commandBoatColor : this.inactiveColor;
      }
      return this.currentSteering === predictor ?
             this.commandBoatColor : this.inactiveColor;
    },
    redraw (ctx, ctx2) {
      /* Hack to workaround challenging reactive & non-reactive interactions */
      const pathStamp = this.pathsNeedRedraw;
      if (pathStamp != this.oldPathStamp) {
        this.__precalcPaths();
        this.oldPathStamp = pathStamp;
      }

      this.__redraw(!this.isDark ? ctx : ctx2);
    },
    __redraw (ctx) {
      const z = this.zoom;

      // ADDME: add mixing to do all world copies and loop then here
      ctx.translate(this.boatOrigo.x - this.viewOrigo.x,
                    this.boatOrigo.y - this.viewOrigo.y);
      for (let pred of this.predictorList) {
        ctx.strokeStyle = this.predictorColor(pred);
        ctx.stroke(predictorData[pred].cachedPath);

        for (let i = 0; i < this.markers[pred].hour.length; i++) {
          let pt = this.markers[pred].hour[i];
          this.drawDot(ctx, z, pt, null, this.hourRadius, false);

          /* Draw solid circle every 6 hours */
          if ((this.predictorLen > 6) && (i > 0) && (i % 6 === 0)) {
            ctx.fill();
          }
        }

        for (let pt of this.markers[pred].quarter) {
          this.drawDot(ctx, z, pt, null, this.quarterRadius, true);
        }
        for (let pt of this.markers[pred].first15min) {
          if (z < 12) {
            continue;
          }
          this.drawDot(ctx, z, pt, null, this.first15minRadius, false);
        }
        for (let pt of this.markers[pred].wx) {
          this.drawDot(ctx, z, pt, 'red', null, true);
        }
        for (let pt of this.markers[pred].dc) {
          if (this.cfgExtraUiDebug) {
            this.$store.dispatch('diagnostics/add', 'predictor: dot (' +
                                                    pt.type + ') redraw to ' +
                                                    pt.latLng.lat + ' ' + pt.latLng.lng);
          }
          this.drawDot(ctx, z, pt, 'orange', null, true);
        }
      }
    },
    drawDot(ctx, z, pt, color, radius, fill) {
      let tmp = this.$parent.map.project(pt.latLng, z)._round()._subtract(this.boatOrigo);
      if (color === null) {
        color = this.predictorColor(pt.type);
      }
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      if (radius === null) {
        radius = (this.activePredictor === pt.type) ?
                  this.plottedDelayRadius : this.otherDelayRadius;
      }

      ctx.beginPath();
      ctx.arc(tmp.x, tmp.y, radius, 0, Math.PI*2);
      if (fill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    },

    precalcPath(predictor) {
      let pred = predictorData[predictor];
      let firstPt = pred.firstLatLng;
      let otherPts = pred.latLngs;

      let p = new Path2D();

      if (firstPt === null) {
        return p;
      }

      const boatOrigo = this.boatOrigo;
      const z = this.zoom;
      const map = this.$parent.map;
      let tmp = map.project(firstPt, z)._round()._subtract(boatOrigo);
      p.moveTo(tmp.x, tmp.y);
      for (let pt of otherPts) {
        let tmp = map.project(pt, z)._round()._subtract(boatOrigo);
        p.lineTo(tmp.x, tmp.y);
      }
      return p;
    },
    cogPath (predictor) {
      let cog = predictorData[predictor];

      let p = new Path2D();
      if (cog.firstLatLng === null) {
        return p;
      }
      const z = this.zoom;

      p.moveTo(0, 0);
      let tmp = this.$parent.map.project(cog.latLngs[cog.latLngs.length - 1], z)._round()._subtract(this.boatOrigo);
      p.lineTo(tmp.x, tmp.y);

      return p;
    },
    __precalcPaths () {
      for (let pred of this.predictorList) {
        let pathFunc = this.predictorDefs[pred].path;
        this.$store.commit('boat/steering/updatePredictorPath',
                           {predictor: pred, path: this[pathFunc](pred)});
      }
    },

    consumeTowback (pred, pos, t) {
      while (t <= this.raceStartTime - this.timeDelta) {
        t += this.timeDelta;

        pred.latLngs.push(pos);
        pred.times.push(t);
        /*
         * This might not match what server does during towback but the
         * error is meaningless for anything.
         */
        pred.perf.push(1.0);
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
    calculatePerfLoss (pred, state, t, oldCommand, oldValue, newCommand, newValue) {
      if (state.perf <= 0.93) {
        return;
      }

      const lastLatLng = pred.latLngs[pred.latLngs.length - 1];
      const wind = latLngWind(lastLatLng, t);

      if (oldCommand == 'cog') {
        oldValue = cogTwdToTwa(oldValue, wind.twd);
      }
      if (newCommand == 'cog') {
        newValue = cogTwdToTwa(newValue, wind.twd);
      }

      const speed = getSpeed(wind.ms, oldValue) * state.perf;
      if ((newValue < 0 && oldValue > 0) || (newValue > 0 && oldValue < 0)) {
        state.perf *= 1 - speed / 200.0;
      } else {
        const dTwa = Math.abs(oldValue) - Math.abs(newValue);
        state.perf *= 1 - Math.abs(dTwa) / 25.0;
      }
    },

    dcPredCalc(pred, dummy, t, endTime, state) {
      let commandType = this.currentSteering;
      let commandValue = this[this.steerTypeToValue[commandType]];
      let dcIdx = 0;
      const dcList = this.$store.state.boat.steering.dcs.list;

      if (this.isTowbackPeriod) {
        for (let dc of dcList) {
          if (dc.time >= this.raceStartTime) {
            break;
          }
          commandType = dc.type === 'cc' ? 'cog' : dc.type;
          commandValue = dc.value;
          dcIdx++;
        }
      }

      while (t < endTime) {
        let nextEnd = endTime;

        while (dcIdx < dcList.length) {
          const dc = dcList[dcIdx];
          if (t + this.timeDelta < dc.time) {
            nextEnd = Math.min(endTime, dc.time - this.timeDelta);
            break;
          }
          const oldType = commandType;
          const oldValue = commandValue;
          commandType = dc.type === 'cc' ? 'cog' : dc.type;
          commandValue = dc.value;
          this.calculatePerfLoss(pred, state, t,
                                 oldType, oldValue,
                                 commandType, commandValue);
          dcIdx++;
        }

        const func = this.predictorDefs[commandType]['calc'];
        t = func(pred, commandValue, t, nextEnd, state);
        if (t === null) {
          break;
        }
      }
    },
    predCalc (predictor) {
      let t = this.timeOrigo;
      const endTime = Math.min(t + this.predictorLenMsec, this.wxLastTimestamp);
      /* Use safe due to freeze */
      let lastLatLng = this.safeLatLng(this.visualPosition);

      let pred = {
        time: t,
        firstLatLng: lastLatLng,
        latLngs: [],
        times: [],
        perf: [],
      };

      if (!this.wxValid) {
        pred.firstLatLng = null;
        return pred;
      }

      let state = {
        perf: this.boatPerf,
        firstStep: 1,
        timeDelta: this.timeDelta,
      };

      pred.latLngs.push(Object.freeze(lastLatLng));
      pred.perf.push(state.perf);
      pred.times.push(t);

      if (this.isTowbackPeriod) {
        t = this.consumeTowback(pred, lastLatLng, t, state);
        state.perf = 1.0;
        state.firstStep = this.moveFractionAfterTowback(t);
      }

      const steerValue = this[this.steerTypeToValue[predictor]];
      const func = this.predictorDefs[predictor]['calc'];
      func(pred, steerValue, t, endTime, state);
      Object.freeze(pred.latLngs);
      Object.freeze(pred.perf);

      return pred;
    },

    getMarker (predictor, idx) {
      const pred = predictorData[predictor];

      if (idx >= pred.latLngs.length) {
        return null;
      }
      return {
        type: predictor,
        latLng: pred.latLngs[idx],
        time: pred.times[idx],
        perf: pred.perf[idx],
      };
    },
    getMarkerLowIdx (predictor, msec) {
      const pred = predictorData[predictor];
      let idx = bsearchLeft(pred.times, msec, 1, pred.times.length - 1) - 1;
      if (idx < 0) {
        return null;
      }
      return idx;
    },

    interpolateMarker (predictor, msec) {
      const pred = predictorData[predictor];

      if ((typeof pred === 'undefined') ||
          (msec > this.predictorLenMsec) || (pred.firstLatLng === null)) {
        return null;
      }

      msec += pred.time;
      const lowIdx = this.getMarkerLowIdx(predictor, msec);
      if (lowIdx === null) {
        return null;
      }
      const highMarker = this.getMarker(predictor, lowIdx + 1);
      if (msec > highMarker.time) {
        return null;
      }
      let marker = this.getMarker(predictor, lowIdx);
      const frac = interpolateFactor(marker.time, msec, highMarker.time);

      marker.time = msec;
      marker.latLng = L.latLng(linearInterpolate(frac,
                                                 marker.latLng.lat,
                                                 highMarker.latLng.lat),
                               linearInterpolate(frac,
                                                 marker.latLng.lng,
                                                 highMarker.latLng.lng));
      return marker;
    },
    /* Creates a copy of latLng (to be freezed) */
    safeLatLng (origLatLng) {
      return L.latLng(origLatLng.lat, origLatLng.lng);
    },
    recalc () {
      if (this.boatId === null) {
        return;
      }
      for (let pred of this.predictorList) {
        this.$store.commit('boat/steering/updatePredictor',
                           {predictor: pred, data: this.predCalc(pred)});
      }
    },
  },
  mounted () {
    this.recalc();
  },
  watch: {
    boatDataUpdated () {
      this.recalc();
    },
    wxDataStamp () {
      this.recalc();
    },
    predictorLen () {
      this.recalc();
    },
    markers (newVal) {
      const fromPred = this.activePredictor;
      if (typeof newVal[fromPred] !== 'undefined') {
        let pts = newVal[fromPred].dc;
        if (pts.length > 0) {
          this.$store.commit('boat/steering/setDelayLatLng', pts[0].latLng);
          return;
        }
      }
      this.$store.commit('boat/steering/setDelayLatLng', null);
    },
    wxValidOrig (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.wxValid = newVal;
      }
      this.recalc();
    },
  },
  render () {
    return null;
  },
}
</script>
