<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { hToMsec, minToMsec, secToMsec, interpolateFactor, linearInterpolate } from '../../lib/utils.js';
import { cogPredictor, twaPredictor } from '../../lib/predictors.js';

export default {
  name: 'SteeringPredictors',
  data () {
    return { 
      time: 0,
      // ADDME: support 10s for the first 10 minutes
      timeDelta: secToMsec(30),

      halfLimit: 24,
      quarterLimit: 12,

      hourRadius: 3,
      quarterRadius: 2,
      first15minRadius: 1,
      plottedDelayRadius: 5,
      otherDelayRadius: 2,

      predictors: {
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
        dcPred: {
          time: 0,
          twa: 0,
          firstLatLng: null,
          latLngs: [],
        },
      },
      predictorDefs: {
        'cog': {
          'calc': cogPredictor,
          'steer': 'boatCog',
          'path': 'cogPath',
        },
        'twa': {
          'calc': twaPredictor,
          'steer': 'boatTwa',
          'path': 'twaPath',
        },
        'dcPred': {
          'calc': this.dcPredCalc,
          'steer': 'boatCog',                    /* Dummy value */
          'path': 'dcPredPath',
        },
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
      if (!this.allowControl || !this.wxValid) {
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

    moveDelta () {
      return (this.timeDelta/1000 / 3600) / 60;  /* m/s -> nm -> deg (in deg) */
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
      for (let i = 1; i < 4 * Math.min(this.predictorLen, this.halfLimit); i++) {
        if ((i % 4) === 0) {
          continue;
        }
        if ((i >= 4 * this.quarterLimit) && (i % 4) !== 2) {
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
      let cog = this.predictors.cog;
      cog.time;

      let p = new Path2D();
      if (cog.firstLatLng === null) {
        return p;
      }
      const z = this.zoom;

      p.moveTo(0, 0);
      let tmp = this.$parent.map.project(cog.latLngs[cog.latLngs.length - 1], z).round().subtract(this.boatOrigo);
      p.lineTo(tmp.x, tmp.y);

      return p;
    },
    twaPath () {
      return this.precalcPath('twa')
    },
    dcPredPath () {
      return this.precalcPath('dcPred');
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
      let res = {};

      for (let pred of this.predictorList) {
        res[pred] = {};
        res[pred].hour = this.getMarkers(pred, this.hourIndexes);
        res[pred].quarter = this.getMarkers(pred, this.quarterIndexes);
        res[pred].first15min = this.getMarkers(pred, this.first15minIndexes);
        if (this.dotDelay === null) {
          res[pred].dc = [];
        } else {
          res[pred].dc = this.interpolateMarkers(pred, hToMsec(this.dotDelay));
        }
        if (this.wxDelay === null || this.wxDelay <= 0) {
          res[pred].wx = [];
        } else {
          res[pred].wx = this.interpolateMarkers(pred, this.wxDelay);
        }
      }
      return res;
    },
    currentSteering () {
      return this.currentSteeringApi === 'cc' ? 'cog' : this.currentSteeringApi;
    },

    needsRedraw() {
      for (let pred of this.predictorList) {
        this.predictors[pred];
      }
      this.wxUpdated;
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
      wxTime: state => state.weather.time,
      raceLoaded: state => state.race.loaded,
      raceStartTime: state => state.race.info.startTime,
      currentSteeringApi: state => state.boat.currentSteering,
      boatCog: state => state.boat.instruments.course.value,
      boatTwa: state => state.boat.instruments.twa.value,
      boatPerf: state => state.boat.instruments.perf.value,
      plottedDcDelay: state => state.boat.steering.plottedSteering.delayTime,
      dcFetchTime: state => state.boat.steering.dcs.fetchTime,
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
      this.__redraw(!this.isDark ? ctx : ctx2);
    },
    __redraw (ctx) {
      const z = this.zoom;

      // ADDME: add mixing to do all world copies and loop then here
      ctx.translate(this.boatOrigo.x - this.viewOrigo.x,
                    this.boatOrigo.y - this.viewOrigo.y);
      for (let pred of this.predictorList) {
        ctx.strokeStyle = this.predictorColor(pred);
        ctx.stroke(this[this.predictorDefs[pred]['path']]);

        for (let pt of this.markers[pred].hour) {
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

        for (let pt of this.markers[pred].quarter) {
          let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
          ctx.fillStyle = this.predictorColor(pt.type);
          ctx.beginPath();
          ctx.arc(tmp.x, tmp.y, this.quarterRadius, 0, Math.PI*2);
          ctx.fill();
        }
        for (let pt of this.markers[pred].first15min) {
          if (this.zoom < 12) {
            continue;
          }
          let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
          ctx.strokeStyle = this.predictorColor(pt.type);
          ctx.beginPath();
          ctx.arc(tmp.x, tmp.y, this.first15minRadius, 0, Math.PI*2);
          ctx.stroke();
        }
        for (let pt of this.markers[pred].wx) {
          this.drawDot(ctx, z, pt, 'red');
        }
        for (let pt of this.markers[pred].dc) {
          if (this.cfgExtraUiDebug) {
            this.$store.dispatch('diagnostics/add', 'predictor: dot (' +
                                                    pt.type + ') redraw to ' +
                                                    pt.latLng.lat + ' ' + pt.latLng.lng);
          }
          this.drawDot(ctx, z, pt, 'orange');
        }
      }
    },
    drawDot(ctx, z, pt, color) {
      let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
      ctx.fillStyle = color;

      ctx.beginPath();
      const radius = (this.activePredictor === pt.type) ?
                     this.plottedDelayRadius : this.otherDelayRadius;
      ctx.arc(tmp.x, tmp.y, radius, 0, Math.PI*2);
      ctx.fill();
    },
    precalcPath(predictor) {
      let pred = this.predictors[predictor];
      pred.time;                             /* Dummy dep */
      let firstPt = pred.firstLatLng;
      let otherPts = pred.latLngs;

      let p = new Path2D();

      if (firstPt === null) {
        return p;
      }

      const z = this.zoom;
      let tmp = this.$parent.map.project(firstPt, z).round().subtract(this.boatOrigo);
      p.moveTo(tmp.x, tmp.y);
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

    dcPredCalc(pred, dummy, t, endTime, state, getters) {
      let commandType = this.currentSteering;
      let commandValue = this[this.predictorDefs[commandType]['steer']];
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
          // FIXME: perf is not returned nor perf loss applied
          commandType = dc.type === 'cc' ? 'cog' : dc.type;
          commandValue = dc.value;
          dcIdx++;
        }

        const func = this.predictorDefs[commandType]['calc'];
        t = func(pred, commandValue, t, nextEnd, state, getters);
        if (t === null) {
          break;
        }
      }
    },
    predCalc (predictor) {
      let t = this.timeOrigo;
      const endTime = t + this.predictorLenMsec;
      let lastLatLng = this.visualPosition;

      let pred = {
        time: t,
        firstLatLng: lastLatLng,
        latLngs: [],
      };

      if (!this.wxValid) {
        pred.firstLatLng = null;
        return pred;
      }
      pred.latLngs.push(Object.freeze(lastLatLng));

      let state = {
        perf: this.boatPerf,
        firstStep: 1,
        moveDelta: this.moveDelta,
        timeDelta: this.timeDelta,
      };

      if (this.isTowbackPeriod) {
        t = this.consumeTowback(pred.latLngs, lastLatLng, t);
        state.perf = 1.0;
        state.firstStep = this.moveFractionAfterTowback(t);
      }

      const steer = this.predictorDefs[predictor]['steer'];
      const func = this.predictorDefs[predictor]['calc'];
      func(pred, this[steer], t, endTime, state, this.$store.getters);
      Object.freeze(pred.latLngs);

      return pred;
    },

    getMarkers (predictor, indexes) {
      const pred = this.predictors[predictor];
      pred.time;

      if (pred.firstLatLng === null) {
        return [];
      }
      let res = [];
      for (let i of indexes) {
        if (i < pred.latLngs.length) {
          res.push({
            type: predictor,
            time: i * this.timeDelta,
            latLng: pred.latLngs[i],
          });
        }
      }
      return res;
    },
    interpolateMarkers (predictor, msec) {
      const pred = this.predictors[predictor];

      if ((typeof pred === 'undefined') ||
          (msec > this.predictorLenMsec) || (pred.firstLatLng === null)) {
        return [];
      } else {
        const idx = msec / this.timeDelta;
        const lowIdx = Math.floor(idx);
        let markers = this.getMarkers(predictor, [lowIdx]);

        if ((markers.length > 0) && (msec < this.predictorLenMsec)) {
          const highMarkers = this.getMarkers(predictor, [lowIdx + 1]);
          const frac = interpolateFactor(lowIdx, idx, lowIdx + 1);

          if (highMarkers.length > 0) {
            markers[0].time = msec;
            markers[0].latLng = L.latLng(linearInterpolate(frac,
                                             markers[0].latLng.lat,
                                             highMarkers[0].latLng.lat),
                                         linearInterpolate(frac,
                                             markers[0].latLng.lng,
                                             highMarkers[0].latLng.lng));
          }
        }
        return markers;
      }
    },
    recalc () {
      if (this.boatId === null) {
        return;
      }
      for (let pred of this.predictorList) {
        this.predictors[pred] = this.predCalc(pred);
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
    wxUpdated () {
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
  },
  render () {
    return null;
  },
}
</script>
