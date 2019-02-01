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
    }
  },

  computed: {
    viewOrigo () {
      this.$parent.center;
      this.$parent.zoom;
      this.$parent.size;

      return this.$parent.map.getPixelBounds().getTopLeft();
    },
    cogPredictor () {
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
        cogPred.latLngs.push(lastLatLng);
        t += this.timeDelta;
      }
      Object.freeze(cogPred.latLngs);

      return cogPred;
    },

    twaPredictor () {
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
        twaPred.latLngs.push(lastLatLng);
        t += this.timeDelta;
      }
      Object.freeze(twaPred.latLngs);

      return twaPred;
    },

    cogPath () {
      return this.precalcPath(this.cogPredictor.firstLatLng,
                              this.cogPredictor.latLngs);
    },
    twaPath () {
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
  },
  render () {
    return null;
  },
}
</script>
