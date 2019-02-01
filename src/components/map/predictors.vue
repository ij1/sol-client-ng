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

      hourRadius: 3,
      quarterRadius: 2,

      cogPredictor: {
        time: 0,
        cog: 0,
        firstLatLng: null,
        latLngs: [],
      },
      twaPredictor: {
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

      return this.$parent.map.getPixelBounds().getTopLeft();
    },
    hourIndexes () {
      let res = [];
      for (let i = 0; i <= 6; i++) {
        res.push(Number((hToMsec(i) / this.timeDelta).toFixed(0)));
      }
      return res;
    },
    quarterIndexes () {
      let res = [];
      for (let i = 1; i < 4 * 6; i++) {
        if ((i % 4) === 0) {
          continue;
        }
        res.push(Number((minToMsec(15) * i / this.timeDelta).toFixed(0)));
      }
      return res;
    },
    cogPath () {
      this.cogPredictor.time;

      let p = new Path2D();
      if (this.cogPredictor.firstLatLng === null) {
        return p;
      }
      const z = this.$parent.zoom;

      let tmp = this.$parent.map.project(this.cogPredictor.firstLatLng, z).round();
      p.moveTo(tmp.x, tmp.y);
      tmp = this.$parent.map.project(this.cogPredictor.latLngs[this.cogPredictor.latLngs.length - 1], z).round();
      p.lineTo(tmp.x, tmp.y);

      return p;
    },
    twaPath () {
      this.twaPredictor.time;

      return this.precalcPath(this.twaPredictor.firstLatLng,
                              this.twaPredictor.latLngs);
    },
    hoursMarkers () {
      return this.getMarkers(this.hourIndexes);
    },
    quarterMarkers () {
      return this.getMarkers(this.quarterIndexes);
    },

    needsRedraw() {
      this.cogPredictor;
      this.twaPredictor;
      /* Monotonically increasing value to trigger watch reliably every time */
      return Date.now();
    },
    ...mapGetters({
      boatTime: 'boat/time',
    }),
    ...mapState({
      wxLoaded: state => state.weather.loaded,
    }),
  },
  methods: {
    redraw (ctx) {
      const z = this.$parent.zoom;

      // ADDME: add mixing to do all world copies and loop then here
      ctx.translate(Math.round(-this.viewOrigo.x),
                    Math.round(-this.viewOrigo.y));
      // ADDME: active predictor highlight
      ctx.strokeStyle = '#ff00ff';
      ctx.stroke(this.cogPath);
      ctx.stroke(this.twaPath);

      for (let pt of this.hoursMarkers) {
        let tmp = this.$parent.map.project(pt, z).round();
        ctx.beginPath();
        ctx.arc(tmp.x, tmp.y, this.hourRadius, 0, Math.PI*2);
        ctx.stroke();
      }

      ctx.fillStyle = '#ff00ff';
      for (let pt of this.quarterMarkers) {
        let tmp = this.$parent.map.project(pt, z).round();
        ctx.beginPath();
        ctx.arc(tmp.x, tmp.y, this.quarterRadius, 0, Math.PI*2);
        ctx.fill();
      }
    },
    precalcPath(firstPt, otherPts) {
      let p = new Path2D();

      if (firstPt === null) {
        return p;
      }
      const z = this.$parent.zoom;

      let tmp = this.$parent.map.project(firstPt, z).round();
      p.moveTo(tmp.x, tmp.y);
      for (let pt of otherPts) {
        tmp = this.$parent.map.project(pt, z).round();
        p.lineTo(tmp.x, tmp.y);
      }
      return p;
    },

    cogPredictorCalc () {
      let t = this.boatTime;
      const endTime = t + hToMsec(6);
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

      while (t <= endTime) {
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

    twaPredictorCalc () {
      let t = this.boatTime;
      const endTime = t + hToMsec(6);
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

      while (t <= endTime) {
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
      this.twaPredictor.time;

      if ((this.cogPredictor.firstLatLng === null) ||
          (this.twaPredictor.firstLatLng === null)) {
        return [];
      }
      let res = [];
      for (let i of indexes) {
        res.push(this.twaPredictor.latLngs[i]);
        res.push(this.cogPredictor.latLngs[i]);
      }
      return res;
    },
  },
  watch: {
    // FIXME: update when wx is loaded
    boatTime () {
      if (!this.wxLoaded) {
        return;
      }
      this.cogPredictor = this.cogPredictorCalc();
      this.twaPredictor = this.twaPredictorCalc();
    },
  },
  render () {
    return null;
  },
}
</script>
