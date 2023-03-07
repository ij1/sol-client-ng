<template>
  <span>
    <span class = "text-placeholder-container">
      <span class = "text-dummy">TWA=+179.{{placeHolderDecimalTxt}}&deg;</span>
      <span class = "text-real" v-if="valid">TWA={{twaTxt}}&deg;</span>
    </span>
    <button
      class = "to-steering-btn"
      @click = "setSteering('twa', twaTxt)"
    >
      &#8680;<img src="../../images/wheel.png"/>
    </button>
    <span v-if = "showCog" class = "text-placeholder-container">
      <span class = "text-dummy">COG=359.{{placeHolderDecimalTxt}}&deg;</span>
      <span class = "text-real" v-if="valid">COG={{cogTxt}}&deg;</span>
    </span>
    <button
      v-if = "showCog"
      class = "to-steering-btn"
      @click = "setSteering('cc', cogTxt)"
    >
      &#8680;<img src="../../images/wheel.png"/>
    </button>
    <span class = "text-placeholder-container">
     <span class = "text-dummy">99.{{placeHolderDecimalTxt}}</span>
     <span class = "text-real" v-if="valid">{{valTxt}}</span>
    </span> kn
  </span>
</template>

<script>
import { mapState } from 'vuex';
import { twaTwdToCog, twaTextPrefix } from '../../lib/nav.js';
import { radToDeg, degToRad } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';

export default {
  name: 'vmcvmgDetail',
  data () {
    return {}
  },
  props: {
    twa: {
      type: Number,
    },
    twd: {
      type: Number,
    },
    val: {
      type: Number,
    },
    label: {
      type: String,
      required: true,
    },
  },
  computed: {
    valid () {
      return this.twa !== null && this.twd !== null && this.value !== null;
    },
    twaTxt () {
      return this.valid ? twaTextPrefix(this.twa) +
                          roundToFixed(radToDeg(this.twa), this.instrumentDecimals) :
                          '';
    },
    cogTxt () {
      return this.valid ? roundToFixed(radToDeg(twaTwdToCog(this.twa, this.twd)),
                                       this.instrumentDecimals): '';
    },
    valTxt () {
      return this.valid ? roundToFixed(this.val, this.instrumentDecimals) : '';
    },
    placeHolderDecimalTxt () {
      return "9".repeat(this.instrumentDecimals);
    },
    ...mapState({
      instrumentDecimals: state => state.boat.instruments.cfg.instrumentDecimals.value,
      showCog: state => state.ui.tools.cfg.cogInMaxCalculator.value,
    }),
  },
  methods: {
    setSteering (type, val) {
      if (!this.valid) {
        return;
      }
      this.$store.commit('ui/setActiveTab', 0);
      this.$store.commit('boat/steering/setSteering', {
        type: type,
        value: degToRad(val),
        valueText: val,
      });
    },
  },
}
</script>
<style scoped>
.to-steering-btn {
  border: 1px solid #c0c0c0;
  padding: 0px 2px;
  margin: 0px;
  margin-right: 5px;
  border-radius: 4px;
  font-size: 16px;
  vertical-align: middle;
}

.to-steering-btn img {
  vertical-align: -2px;
}

.text-placeholder-container {
  position: relative;
  top: 0;
  left: 0;
}
.text-dummy {
  opacity: 0;
  text-weight: bold;
  user-select: none;
}
.text-real {
  position: absolute;
  right: 0;
  top: 0;
}
</style>
