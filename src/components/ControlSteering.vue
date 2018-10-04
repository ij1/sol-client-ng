<template>
  <div id="steering">
    <div class="steering-input">
      <input
        type="radio"
        id="type"
        value="cc"
        v-model="type"
        @click="$refs.cc.focus()"
      >
      <label for="cc" @click="type = 'cc'">COG</label>
      <input
        class = "steering-input-box"
        ref="cc"
        id="cc"
        @click="type = 'cc'"
        v-model.trim="cc"
        maxlength = 7
        size = 7
      >&deg;
    </div>
    <div class="steering-input">
      <input
        type="radio"
        id="type"
        value="twa"
        v-model="type"
        @click="$refs.twa.focus()"
      >
      <label for="twa" @click="type = 'twa'">TWA</label>
      <input
        class = "steering-input-box"
        ref="twa"
        id="twa"
        @click="type = 'twa'"
        v-model.trim="twa"
        maxlength = 8
        size = 8
      >&deg;
    </div>
    <div class="steering-input">
      <input
        type="checkbox"
        id="delayOn"
        v-model="delayOn"
        @click="$refs.delay.focus()"
      >
      <label for="delay" @click="delayOn = true">Delay for</label>
      <input
        class = "steering-input-box"
        ref="delay"
        id="delay"
        v-model.trim="delay"
        maxlength = 8
        size = 8
      >
    </div>
    <div>
      <button
        @click="sendSteeringCommand"
        :disabled = "!canSend"
      >
        {{applySteeringTxt}}
      </button>
    </div>
    <control-steering-polar/>
  </div>
</template>

<script>
import ControlSteeringPolar from './ControlSteeringPolar.vue';

// FIXME: The values should probably use some arbitary precision library
// to avoid unexpected rounding with floating-points.
// CHECKME: How negative TWA should be rounded? Up or down?

export default {
  name: 'ControlSteering',
  components: {
    'control-steering-polar': ControlSteeringPolar,
  },
  data () {
    return {
      type: 'cc',
      cc: '0.0',
      twa: '',
      delayOn: false,
      delay: '',
      prevCopyDecimals: 2,
    }
  },

  computed: {
    canSend () {
      return (!this.delayOn || this.isDelayValid) && this.isSteeringValid &&
        !this.$store.state.boat.steering.sending;
    },

    // FIXME: convert state.boat.instruments to floats instead of strings
    // ...it would make things easier here!
    ccTwaDelta () {
      let twd = this.$store.state.boat.instruments.twd;
      if (typeof twd === 'undefined') {
        return 0;
      }
      twd = parseFloat(twd);
      if (isNaN(twd)) {
        return 0;
      }
      return Number((twd * 180.0 / Math.PI).toFixed(this.copyDecimals));
    },
    oldTwa () {
      let twa = this.$store.state.boat.instruments.twd;
      if (typeof twa === 'undefined') {
        return 0;
      }
      twa = parseFloat(twa);
      if (isNaN(twa)) {
        return 0;
      }
      return twa;
    },

    isCcValid () {
       const regex = new RegExp(/^\d{1,3}(\.\d{1,3})?$/)
       if (!regex.test(this.cc)) {
         return false;
       }
       const num = Number(this.cc);
       if (num < 0 || num > 360) {
         return false;
       }
       return true;
    },
    isTwaValid () {
       const regex = new RegExp(/^[-+]\d{1,3}(\.\d{1,3})?$/)
       if (!regex.test(this.twa)) {
         return false;
       }
       const num = Number(this.twa);
       if (num < -180 || num > 180) {
         return false;
       }
       return true;
    },

    isDelayValid () {
      // ADDME: parse 1h10m format too
      const delay = parseFloat(this.delay);
      return (Number.isFinite(delay) && delay >= 0);
    },

    isSteeringValid () {
      return ((this.type === 'cc') && this.isCcValid) ||
             ((this.type === 'twa') && this.isTwaValid);
    },

    toTwa () {
      if (!this.isCcValid) {
        return undefined;
      }
      // ADDME: update this.copyDecimals (but will it update ccTwaDelta
      // immediately?)
      const cc = parseFloat(this.cc);
      let diff = this.ccTwaDelta - cc;
      if (diff > 180) {
        diff -= 360;
      } else if (diff < -180) {
        diff += 360;
      }

      /* Try to avoid gybe with TWA=+/-180.0 */
      if (Math.abs(diff) > 179.999) {
        if (Math.sign(diff) != Math.sign(this.$store.state.boat.instruments.twa)) {
          diff = -diff;
        }
      }

      return diff.toFixed(this.copyDecimals);
    },
    toCc () {
      if (!this.isTwaValid) {
        return undefined;
      }
      // ADDME: update this.copyDecimals (but will it update ccTwaDelta
      // immediately?)
      const twa = parseFloat(this.twa);
      let diff = this.ccTwaDelta - twa;
      if (diff < 0) {
        diff += 360.0;
      } else if (diff >= 360.0) {
        diff -= 360.0;
      }
      return diff.toFixed(this.copyDecimals);
    },

    /* If user inputs 3 decimals, we copy with precision of 3 decimal but
     * use only 2 decimals otherwise.
     *
     * WARNING: This has a side-effect, it calls storePrevCopyDecimals to
     * update this.prevCopyDecimals, which is only used internally by this
     * function in case the current value is not valid (e.g., user typing
     * one number too many or something along those lines). The store call
     * is a HACK to avoid Vue.js detection the side-effect :-).
     */
    copyDecimals () {
       let fromVal;
       if (this.type === 'cc') {
         if (!this.isCcValid && this.cc !== '') {
           return this.prevCopyDecimals;
         } else {
           fromVal = this.cc;
         }
       } else if (this.type === 'twa') {
         if (!this.isTwaValid && !(this.twa === '' || this.twa === '-' || this.twa === '+')) {
           return this.prevCopyDecimals;
         } else {
           fromVal = this.twa;
         }
       }

       const regex = new RegExp(/\.\d{1,3}$/);
       const res = regex.exec(fromVal);
       let decimals = 2;
       if ((res !== null) && ((res[0].length - 1) === 3)) {
         decimals = 3;
       }
       /* HACK to silence side-effects */
       decimals = this.storePrevCopyDecimals(decimals);
       return decimals;
    },

    delayTime () {
      if (!this.delayOn && !this.isDelayValid) {
        return null;
      }

      return parseFloat(this.delay);
    },

    ccRad () {
      return this.cc * Math.PI / 180;
    },
    twaRad () {
      return this.twa * Math.PI / 180;
    },

    applySteeringTxt () {
      if (this.delayOn && this.isDelayValid && this.delayTime > 0) {
        return 'Send command';
      } else if (this.isSteeringValid) {
        if (Math.sign(this.oldTwa) !== Math.sign(this.twa)) {
          // ADDME: for 'Tack'/'Gybe' angles need to figured out
          return 'Tack/Gybe';
        }
      }
      return 'Change course';
    }
  },

  watch: {
    toCc (value) {
      if ((this.type === 'cc') || (typeof value === 'undefined')) {
        return;
      }
      this.cc = value;
    },
    toTwa (value) {
      if ((this.type === 'twa') || (typeof value === 'undefined')) {
        return;
      }
      this.twa = ((value[0] !== '-') ? '+' : '') + value;
    }
  },

  methods: {
    sendSteeringCommand () {
      if (!this.canSend) {
        return;
      }
      const sendParams = {
        delay: this.delayOn ? this.delayTime : 0,
        value: this.type === 'cc' ? this.ccRad : this.twaRad,
        command: this.type,
      };
      this.$store.dispatch('boat/steering/sendSteeringCommand', sendParams);
    },

    /* HACK to avoid side-effect detector for computed properties */
    storePrevCopyDecimals(value) {
      this.prevCopyDecimals = value;
      return value;
    }
  }
}
</script>

<style scoped>
#steering {
  font-size: 10px;
}
.steering-input {
  text-align: left;
}
.steering-input-box {
  font-size: 10px;
  font-weight: bold;
}
</style>
