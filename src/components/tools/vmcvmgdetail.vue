<template>
  <span>
    <span class = "text-placeholder-container">
      <span class = "text-dummy">TWA=+179.999&deg;</span>
      <span class = "text-real" v-if="valid">TWA={{twaTxt}}&deg;</span>
    </span>
    <button
      class = "to-steering-btn"
      @click = "setSteering('twa', twaTxt)"
    >
      <img src="../../images/wheel.png"/>
    </button>
    <span class = "text-placeholder-container">
      <span class = "text-dummy">COG=359.999&deg;</span>
      <span class = "text-real" v-if="valid">COG={{cogTxt}}&deg;</span>
    </span>
    <button
      class = "to-steering-btn"
      @click = "setSteering('cc', cogTxt)"
    >
      <img src="../../images/wheel.png"/>
    </button>
    <span class = "text-placeholder-container">
     <span class = "text-dummy">99.999</span>
     <span class = "text-real" v-if="valid">{{valTxt}}</span>
    </span> kn
  </span>
</template>

<script>
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
                          roundToFixed(radToDeg(this.twa), 3) :
                          '';
    },
    cogTxt () {
      return this.valid ? roundToFixed(radToDeg(twaTwdToCog(this.twa, this.twd)), 3): '';
    },
    valTxt () {
      return this.valid ? roundToFixed(this.val, 3) : '';
    },
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
  border: 0px;
  padding: 0px;
  margin: 0px;
  margin-right: 5px;
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
