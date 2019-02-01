<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet'
import { degToRad, hToMsec } from '../../lib/utils.js';
import { cogTwdToTwa, twaTwdToCog } from '../../lib/nav.js';

export default {
  name: 'SteeringPredictors',
  data () {
    return { 
      time: 0,
      timeDelta: 30 * 1000,
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
      ctx.translate(Math.round(-this.viewOrigo.x),
                    Math.round(-this.viewOrigo.y));
      // ADDME: active predictor highlight
      ctx.strokeStyle = '#ff00ff';
      ctx.stroke(this.cogPath);
      ctx.stroke(this.twaPath);
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
