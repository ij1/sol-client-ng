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
        />
      </div>
      <div>
        <label for = "twd">TWD:</label>
        <input
          id = "twd"
          v-model.trim = "twd"
          maxlength = 8
          size = 8
        />
      </div>
      <div>
        <label for = "bearing">Bearing:</label>
        <input
          id = "bearing"
          v-model.trim = "bearing"
          maxlength = 8
          size = 8
        />
      </div>
      <div>
        <label for = "bearing">Max VMG up</label>
        <vmcvmg-detail
          v-if = "curve !== null && twdValid"
          :twa = "twaSign * curve.maxvmg.up.twa"
          :val = "curve.maxvmg.up.vmg"
          :twd = "twdRad"
          label = "VMG"
        />
      </div>
      <div>
        <label for = "bearing">Max VMG down</label>
        <vmcvmg-detail
          v-if = "curve !== null && twdValid"
          :twa = "twaSign * curve.maxvmg.down.twa"
          :val = "curve.maxvmg.down.vmg"
          :twd = "twdRad"
          label = "VMG"
        />
      </div>
      <div>
        <label for = "bearing">Max VMC</label>
        <vmcvmg-detail
          v-if = "maxvmc !== null"
          :twa = "maxvmc.twa"
          :val = "maxvmc.vmc"
          :twd = "twdRad"
          label = "VMC"
        />
      </div>
      <div>
        <label for = "bearing">Max BS</label>
        <vmcvmg-detail
          v-if = "curve !== null && twdValid"
          :twa = "twaSign * curve.maxspeed.twa"
          :val = "curve.maxspeed.speed"
          :twd = "twdRad"
          label = "BS"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { MS_TO_KNT } from '../../lib/sol.js';
import { gcCalc, isCcValid } from '../../lib/nav.js';
import { radToDeg, degToRad } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import vmcvmgDetail from './vmcvmgdetail.vue';

export default {
  name: 'MaxvmcTool',
  components: {
    'vmcvmg-detail': vmcvmgDetail,
  },
  data () {
    return {
      fromInstruments: true,
      tws: '',         /* In knots */
      twd: '',
      bearing: '',
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
    twaSign () {
      return this.fromInstruments && this.boatLoaded !== null &&
             this.boatTwa < 0 ? -1 : 1;
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
        return this.$store.getters['boat/polar/curve'](this.tws);
      }
      return null;
    },
    maxvmc () {
      if (this.curve === null || !this.twdValid || !this.bearingValid) {
        return null;
      }
      return this.$store.getters['boat/polar/maxvmc'](this.curve,
                                                      degToRad(this.bearing),
                                                      this.twdRad);
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
  },
  methods: {
    updateFromInstruments () {
      if (this.boatLoaded === null) {
        return;
      }
      this.tws = roundToFixed(this.boatTws * MS_TO_KNT, 3);
      this.twd = roundToFixed(radToDeg(this.boatTwd), 3);
      const gcPath = gcCalc(this.visualPosition, this.currentTarget.latLng);
      this.bearing = roundToFixed(radToDeg(gcPath.startBearing), 3);
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
  },
}
</script>

<style scoped>
.tools-popup {
  width: 10%;
}
</style>