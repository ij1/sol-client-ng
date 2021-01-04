<template>
  <span v-if="valid">
    TWA: {{twaTxt}}&deg;
    COG: {{cogTxt}}&deg;
    {{label}}: {{valTxt}} kts
  </span>
</template>

<script>
import { twaTwdToCog } from '../../lib/nav.js';
import { radToDeg } from '../../lib/utils.js';
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
      return this.valid ? roundToFixed(radToDeg(this.twa), 3): '';
    },
    cogTxt () {
      return this.valid ? roundToFixed(radToDeg(twaTwdToCog(this.twa, this.twd)), 3): '';
    },
    valTxt () {
      return this.valid ? roundToFixed(this.val, 3) : '';
    },
  },
}
</script>
