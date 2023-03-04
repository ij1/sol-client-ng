<template>
  <div>
    <div class = "tools-header">Max calculator</div>
    <div class = "tools-content">
      <div>
        <label for = "fromInstruments">From instruments:</label>
        <input
          id = "fromInstruments"
          type = "checkbox"
          v-model = "fromInstruments"
        />
      </div>
      <div>
        <label for = "tws">TWS:</label>
        <input
          id = "tws"
          v-model.trim = "tws"
          maxlength = 8
          size = 8
          :readonly="fromInstruments"
        />
      </div>
      <div>
        <label for = "twd">TWD:</label>
        <input
          id = "twd"
          v-model.trim = "twd"
          maxlength = 8
          size = 8
          :readonly="fromInstruments"
        />
      </div>
      <div>
        <label for = "bearing">Bearing:</label>
        <input
          id = "bearing"
          v-model.trim = "bearing"
          maxlength = 8
          size = 8
          :readonly="fromInstruments"
        />
        <span>
          <input
            type="radio"
            :value="true"
            v-model="gcMode"
            :readonly="!fromInstruments"
          />GC
          <input
            type="radio"
            :value="false"
            v-model="gcMode"
            :readonly="!fromInstruments"
          />Rh
        </span>
      </div>
      <div>
        <label for = "vmc-detail">Max VMC:</label>
        <vmcvmg-detail
          id = "vmc-detail"
          :twa = "maxvmc.twa"
          :val = "maxvmc.vmc"
          :twd = "twdRad"
          label = "VMC"
        />
      </div>
      <div>
        <label for = "max-tack">Tack:</label>
        <span>
          <input type="radio" id="starboard" value="1" v-model="tack"/>
          <label for="starboard">Starboard</label>
          <input type="radio" id="port" value="-1" v-model="tack"/>
          <label for="port">Port</label>
        </span>
      </div>
      <div>
        <div>Max VMG</div>
        <label for = "vmg-up" class = "vmg-label">&#8593;:</label>
        <vmcvmg-detail
          id = "vmg-up"
          :twa = "tack * curveObj.maxvmg.up.twa"
          :val = "curveObj.maxvmg.up.vmg"
          :twd = "twdRad"
          label = "VMG"
        />
      </div>
      <div>
        <label for = "vmg-down" class = "vmg-label">&#8595;:</label>
        <vmcvmg-detail
          id = "vmg-down"
          :twa = "tack * curveObj.maxvmg.down.twa"
          :val = "curveObj.maxvmg.down.vmg"
          :twd = "twdRad"
          label = "VMG"
        />
      </div>
      <div>
        <label for = "bearing">Max BS:</label>
        <vmcvmg-detail
          :twa = "tack * curveObj.maxspeed.twa"
          :val = "curveObj.maxspeed.speed"
          :twd = "twdRad"
          label = "BS"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import L from 'leaflet';
import { MS_TO_KNT } from '../../lib/sol.js';
import { gcCalc, loxoCalc, isCcValid, minTurnAngle } from '../../lib/nav.js';
import { radToDeg, degToRad } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import { EventBus } from '../../lib/event-bus.js';
import vmcvmgDetail from './vmcvmgdetail.vue';

const emptyCurve = {
  maxvmg: {
    up: {
      twa: null,
      vmg: null,
    },
    down: {
      twa: null,
      vmg: null,
    },
  },
  maxspeed: {
    twa: null,
    speed: null,
  },
};

export default {
  name: 'MaxvmcTool',
  components: {
    'vmcvmg-detail': vmcvmgDetail,
  },
  data () {
    return {
      fromInstruments: true,
      customFromPos: null,
      pathBearing: false,	/* Bearing is set from path, not manually */
      tws: '',         /* In knots */
      twd: '',
      bearing: '',
      tack: 1,
      gcMode: this.$store.state.ui.cfg.gcMode.value,
    };
  },
  computed: {
    twsValid () {
      const regex = /^\d{1,3}(\.\d{1,3})?$/;
      return regex.test(this.tws);
    },
    twdValid () {
      return isCcValid(this.twd);
    },
    twdRad () {
      return this.twdValid ? degToRad(this.twd) : null;
    },
    bearingValid () {
      return isCcValid(this.bearing);
    },
    curve () {
      if (this.fromInstruments) {
        return this.fgCurve;
      } else if (this.twsValid) {
        /* Avoid low-order digit variations when toggling from instruments off */
        if (roundToFixed(this.boatTws * MS_TO_KNT, 3) === this.tws) {
          return this.fgCurve;
        }
        return this.$store.getters['boat/polar/curve'](this.tws);
      }
      return null;
    },
    curveObj () {
      if (this.curve === null) {
        return emptyCurve;
      }
      return this.curve;
    },
    maxvmc () {
      if (this.curve === null || !this.twdValid || !this.bearingValid) {
        return {
          twa: null,
          vmc: null,
        };
      }
      return this.$store.getters['boat/polar/maxvmc'](this.curve,
                                                      degToRad(this.bearing),
                                                      this.twdRad);
    },
    fromPos () {
      if (this.customFromPos !== null) {
        return this.customFromPos;
      }
      return this.visualPosition;
    },
    nearestWrapOfTarget () {
      if (this.currentTarget === null) {
        return null;
      }

      const diff = minTurnAngle(degToRad(this.fromPos.lng),
                                degToRad(this.currentTarget.latLng.lng));

      return L.latLng(this.currentTarget.latLng.lat,
                      this.fromPos.lng + radToDeg(diff));
    },
    ...mapState({
      boatTws: state => state.boat.instruments.tws.value,
      boatTwd: state => state.boat.instruments.twd.value,
      boatTwa: state => state.boat.instruments.twa.value,
      boatLoaded: state => state.boat.id,
    }),
    ...mapGetters({
      fgCurve: 'boat/polar/currentCurve',
      visualPosition: 'boat/visualPosition',
      currentTarget: 'ui/currentTarget',
    }),
  },
  mounted () {
    if (this.fromInstruments) {
      this.updateFromInstruments();
    }
    this.updateTack();
    EventBus.$on('pick-from-map', this.pickFromMap);
  },
  beforeDestroy () {
    EventBus.$off('pick-from-map', this.pickFromMap);
  },
  methods: {
    updateWind(tws, twd) {
      this.tws = roundToFixed(tws, 3);
      this.twd = roundToFixed(radToDeg(twd), 3);
    },
    updateFromInstruments () {
      if (this.boatLoaded === null) {
        return;
      }
      this.updateWind(this.boatTws * MS_TO_KNT, this.boatTwd);
      this.updatePath();
    },
    updatePath () {
      if (this.boatLoaded === null) {
        return;
      }
      const path = this.gcMode ?
                   gcCalc(this.fromPos, this.currentTarget.latLng) :
                   loxoCalc(this.fromPos, this.nearestWrapOfTarget);
      this.pathBearing = true;
      this.bearing = roundToFixed(radToDeg(path.startBearing), 3);
    },
    updateTack () {
      this.tack = this.boatTwa >= 0 ? 1 : -1;
    },
    pickFromMap (pickLatLng) {
      if (!this.fromInstruments) {
        const wind = this.$store.getters['weather/latLngWind'](pickLatLng,
                                                               this.wxTime);
        if (wind === null) {
          return;
        }
        this.updateWind(wind.knots, wind.twd);
        this.customFromPos = pickLatLng;
        this.updatePath();
      }
    },
  },
  watch: {
    boatTws () {
      if (this.fromInstruments) {
        this.updateFromInstruments();
      }
    },
    currentTarget () {
      if (this.fromInstruments) {
        this.updateFromInstruments();
      }
    },
    fromInstruments () {
      if (this.fromInstruments) {
        this.customFromPos = null;
        this.updateFromInstruments();
        this.updateTack();
      }
    },
    bearing () {
      if (this.customFromPos !== null && !this.pathBearing) {
        this.customFromPos = null;
      }
      this.pathBearing = false;
    },
    gcMode () {
      if (this.fromInstruments || this.customFromPos) {
        this.updatePath();
      }
    },
  },
}
</script>

<style scoped>
.vmg-label {
  margin-left: 8px;
  font-size: 12px;
}
</style>
