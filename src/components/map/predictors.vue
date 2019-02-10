<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet'
import { degToRad, hToMsec, minToMsec, secToMsec } from '../../lib/utils.js';
import { cogTwdToTwa, twaTwdToCog } from '../../lib/nav.js';

export default {
  name: 'SteeringPredictors',
  data () {
    return { 
      time: 0,
      // ADDME: support 10s for the first 10 minutes
      timeDelta: secToMsec(30),
      predictorLen: 6,

      hourRadius: 3,
      quarterRadius: 2,
      plottedDelayRadius: 3,
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
    viewOrigo () {
      this.$parent.center;
      this.$parent.zoom;
      this.$parent.size;

      return this.$parent.map.getPixelBounds().getTopLeft().round();
    },
    boatOrigo () {
      const z = this.$parent.zoom;

      if (this.$store.state.boat.position === null) {
        return this.viewOrigo;
      }
      return this.$parent.map.project(this.$store.state.boat.position, z).round();
    },
    currentSteering () {
      return this.$store.state.boat.currentSteering;
    },
    hourIndexes () {
      let res = [];
      for (let i = 0; i <= this.predictorLen; i++) {
        res.push(Number((hToMsec(i) / this.timeDelta).toFixed(0)));
      }
      return res;
    },
    quarterIndexes () {
      let res = [];
      for (let i = 1; i < 4 * this.predictorLen; i++) {
        if ((i % 4) === 0) {
          continue;
        }
        res.push(Number((minToMsec(15) * i / this.timeDelta).toFixed(0)));
      }
      return res;
    },
    cogPath () {
      this.cog.time;

      let p = new Path2D();
      if (this.cog.firstLatLng === null) {
        return p;
      }
      const z = this.$parent.zoom;

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
    predictorMarkers () {
      const time = this.plottedDcDelay;
      if ((time === null) ||
          (time > this.predictorLen)) {
        return [];
      } else {
        const idx = Number((hToMsec(time) / this.timeDelta).toFixed(0));
        return this.getMarkers([idx]);
      }
    },

    needsRedraw() {
      this.cog;
      this.twa;
      this.wxUpdated;
      this.plottedDcDelay;

      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    ...mapGetters({
      boatTime: 'boat/time',
    }),
    ...mapState({
      wxLoaded: state => state.weather.loaded,
      wxUpdated: state => state.weather.data.updated,
      plottedDcDelay: state => state.boat.steering.plottedSteering.delayTime,
    }),
  },
  methods: {
    predictorColor (predictor) {
      return this.currentSteering === predictor ? '#ff00ff' : 'rgb(170, 0, 170, 0.5)';
    },
    redraw (ctx) {
      const z = this.$parent.zoom;

      // ADDME: add mixing to do all world copies and loop then here
      ctx.translate(this.boatOrigo.x - this.viewOrigo.x,
                    this.boatOrigo.y - this.viewOrigo.y);
      ctx.strokeStyle = this.predictorColor('cc');
      ctx.stroke(this.cogPath);
      ctx.strokeStyle = this.predictorColor('twa');
      ctx.stroke(this.twaPath);

      for (let pt of this.hoursMarkers) {
        let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
        ctx.strokeStyle = this.predictorColor(pt.type);
        ctx.beginPath();
        ctx.arc(tmp.x, tmp.y, this.hourRadius, 0, Math.PI*2);
        ctx.stroke();
      }

      for (let pt of this.quarterMarkers) {
        let tmp = this.$parent.map.project(pt.latLng, z).round().subtract(this.boatOrigo);
        ctx.fillStyle = this.predictorColor(pt.type);
        ctx.beginPath();
        ctx.arc(tmp.x, tmp.y, this.quarterRadius, 0, Math.PI*2);
        ctx.fill();
      }
      for (let pt of this.predictorMarkers) {
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

      const z = this.$parent.zoom;
      p.moveTo(0, 0);
      for (let pt of otherPts) {
        let tmp = this.$parent.map.project(pt, z).round().subtract(this.boatOrigo);
        p.lineTo(tmp.x, tmp.y);
      }
      return p;
    },

    cogCalc () {
      let t = this.boatTime;
      const endTime = t + hToMsec(this.predictorLen);
      let lastLatLng = this.$store.state.boat.position;

      let cogPred = {
        time: t,
        cog: this.$store.state.boat.instruments.course.value,
        firstLatLng: lastLatLng,
        latLngs: [],
      };

      if (!this.wxLoaded) {
        return cogPred;
      }
      cogPred.latLngs.push(Object.freeze(lastLatLng));

      const delta = (this.timeDelta/1000 / 3600) / 60;  /* m/s -> nm -> deg (in deg) */

      while (t < endTime) {
        const wind = this.$store.getters['weather/latLngWind'](lastLatLng, t);
        const twa = cogTwdToTwa(cogPred.cog, wind.twd);
        const speed = this.$store.getters['boat/polar/getSpeed'](wind.ms, twa);

        const lonScaling = Math.abs(Math.cos(degToRad(lastLatLng.lat)));
        const dlon = delta * speed * Math.sin(cogPred.cog) / lonScaling;
        const dlat = delta * speed * Math.cos(cogPred.cog);

        lastLatLng = L.latLng(lastLatLng.lat + dlat,
                              lastLatLng.lng + dlon);
        cogPred.latLngs.push(Object.freeze(lastLatLng));
        t += this.timeDelta;
      }
      Object.freeze(cogPred.latLngs);
      return cogPred;
    },

    twaCalc () {
      let t = this.boatTime;
      const endTime = t + hToMsec(this.predictorLen);
      let lastLatLng = this.$store.state.boat.position;

      let twaPred = {
        time: t,
        twa: this.$store.state.boat.instruments.twa.value,
        firstLatLng: lastLatLng,
        latLngs: [],
      };

      if (!this.wxLoaded) {
        return twaPred;
      }
      twaPred.latLngs.push(Object.freeze(lastLatLng));

      const delta = (this.timeDelta/1000 / 3600) / 60;  /* m/s -> nm -> deg (in deg) */

      while (t < endTime) {
        const wind = this.$store.getters['weather/latLngWind'](lastLatLng, t);
        const speed = this.$store.getters['boat/polar/getSpeed'](wind.ms, twaPred.twa);

        const course = twaTwdToCog(twaPred.twa, wind.twd);
        const lonScaling = Math.abs(Math.cos(degToRad(lastLatLng.lat)));
        const dlon = delta * speed * Math.sin(course) / lonScaling;
        const dlat = delta * speed * Math.cos(course);

        lastLatLng = L.latLng(lastLatLng.lat + dlat,
                              lastLatLng.lng + dlon);
        twaPred.latLngs.push(Object.freeze(lastLatLng));
        t += this.timeDelta;
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
        res.push({
          type: 'twa',
          latLng: this.twa.latLngs[i],
        });
        res.push({
          type: 'cc',
          latLng: this.cog.latLngs[i],
        });
      }
      return res;
    },
    recalc () {
      if (!this.wxLoaded) {
        return;
      }
      this.cog = this.cogCalc();
      this.twa = this.twaCalc();
    },
  },
  watch: {
    // FIXME: update when wx is loaded
    boatTime () {
      this.recalc();
    },
  },
  render () {
    return null;
  },
}
</script>
