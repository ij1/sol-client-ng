<template>
  <div id="steering">
    <form @submit.prevent = "sendSteeringCommand">
      <div class = "steering-input">
        <input
          type = "radio"
          id = "type"
          value = "cc"
          v-model = "type"
          @click = "$refs.cc.focus()"
        >
        <label for = "cc" @click = "type = 'cc'">COG</label>
        <input
          class = "steering-input-box"
          ref = "cc"
          id = "cc"
          @click="type = 'cc'"
          v-model.trim = "cc"
          maxlength = 7
          size = 7
        >&deg;
      </div>
      <div class = "steering-input">
        <input
          type = "radio"
          id = "type"
          value = "twa"
          v-model = "type"
          @click = "$refs.twa.focus()"
        >
        <label for = "twa" @click = "type = 'twa'">TWA</label>
        <input
          class = "steering-input-box"
          :style = "{'background-color': this.twaColor}"
          ref = "twa"
          id = "twa"
          @click = "type = 'twa'"
          v-model.trim = "twa"
          maxlength = 8
          size = 8
        >&deg;
      </div>
      <div class = "steering-input">
        <input
          type = "checkbox"
          id = "delayOn"
          v-model = "delayOn"
          @click = "$refs.delay.focus()"
        >
        <label for = "delay" @click = "delayOn = true">Delay for</label>
        <input
          class = "steering-input-box"
          ref = "delay"
          id = "delay"
          v-model.trim = "delay"
          maxlength = 8
          size = 8
        >
      </div>
      <div>
        <button type = "submit" :disabled = "!canSend">
          {{applySteeringTxt}}
        </button>
      </div>
    </form>
    <control-steering-polar/>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Polar from './polar.vue';
import { radToDeg, degToRad } from '../../../lib/utils.js';
import { isCcValid, isTwaValid } from '../../../lib/nav.js';

// FIXME: The values should probably use some arbitary precision library
// to avoid unexpected rounding with floating-points.
// CHECKME: How negative TWA should be rounded? Up or down?

export default {
  name: 'ControlSteering',
  components: {
    'control-steering-polar': Polar,
  },

  /* The computed properties are tricky in this component! As COG/TWA fields
   * have cross depency based on the radio button, the reactivity might cause
   * infinite loops if not dealt correctly. There are toTwa & toCc computed
   * properties and associated watches for them to deal with the cross copy.
   * The copy is only performed if the radio button is in the correct position.
   * After copy, the other toXX chain will trigger but since the radio button
   * prevents copying to value back, the infinite loop is avoided.
   *
   * Touching any unnecessary variables before ensuring the input is valid
   * must be avoided because of the infinite loop threat.
   *
   * The varying number of decimals used by the copy is yet another complexity
   * adding feature. Change in the number of decimals can trigger recalculation
   * of the toXX value for the second time but again the unchanged YY from
   * which the copy is to be made, no further copyDecimals updated will be
   * done until new input.
   */
  computed: {
    type: {
      get () {
        return this.plottedSteering.type;
      },
      set (value) {
        this.$store.commit('boat/steering/setType', value);
      },
    },
    cc: {
      get () {
        return this.plottedSteering.cc;
      },
      set (value) {
        this.$store.commit('boat/steering/setCc', value);
      },
    },
    twa: {
      get () {
        return this.plottedSteering.twa;
      },
      set (value) {
        this.$store.commit('boat/steering/setTwa', value);
      },
    },
    delayOn: {
      get () {
        return this.plottedSteering.delayOn;
      },
      set (value) {
        this.$store.commit('boat/steering/setDelayOn', value);
      },
    },
    delay: {
      get () {
        return this.plottedSteering.delay;
      },
      set (value) {
        this.$store.commit('boat/steering/setDelay', value);
      },
    },
    prevCopyDecimals () {
      return this.plottedSteering.prevCopyDecimals;
    },

    canSend () {
      return (!this.delayOn || this.isDelayValid) && this.isSteeringValid &&
        !this.$store.state.boat.steering.sending;
    },
    twaColor () {
      if (!this.isTwaValid) {
        return 'unset';
      } else if (this.twaRad === 0) {
        return 'unset';
      } else if (this.twaRad < 0) {
        return 'red';
      } else {
        return '#7fff00';
      }
    },

    ccTwaDelta () {
      let twd = this.$store.state.boat.instruments.twd.value;
      if (twd === null) {
        return 0;
      }
      return Number(radToDeg(twd).toFixed(this.copyDecimals));
    },
    oldTwa () {
      let twa = this.$store.state.boat.instruments.twa.value;
      if (twa === null) {
        return 0;
      }
      return twa;
    },

    isCcValid () {
       return isCcValid(this.cc);
    },
    isTwaValid () {
      return isTwaValid(this.twa);
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
      const cc = parseFloat(this.cc);
      let diff = this.ccTwaDelta - cc;
      if (diff > 180) {
        diff -= 360;
      } else if (diff < -180) {
        diff += 360;
      }

      /* Try to avoid gybe with TWA=+/-180.0 */
      if (Math.abs(diff) > 179.999) {
        if (Math.sign(diff) !== Math.sign(this.$store.state.boat.instruments.twa.value)) {
          diff = -diff;
        }
      }

      return diff.toFixed(this.copyDecimals);
    },
    toCc () {
      if (!this.isTwaValid) {
        return undefined;
      }
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
     * WARNING: This has a side-effect, it calls setPrevCopyDecimals to
     * update this.prevCopyDecimals, which is only used internally by this
     * function in case the current value is not valid (e.g., user typing
     * one number too many or something along those lines).
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
       this.$store.commit("boat/steering/setPrevCopyDecimals", decimals);
       return decimals;
    },

    delayTime () {
      if (!this.delayOn && !this.isDelayValid) {
        return null;
      }

      return parseFloat(this.delay);
    },

    ccRad () {
      return degToRad(this.cc);
    },
    twaRad () {
      return degToRad(this.twa);
    },

    applySteeringTxt () {
      if (this.delayOn && this.isDelayValid && this.delayTime > 0) {
        return 'Send command';
      } else if (this.isSteeringValid) {
        if ((Math.abs(this.oldTwa) > 0) && (Math.abs(this.twa) > 0) &&
            (Math.sign(this.oldTwa) !== Math.sign(this.twa))) {
          // ADDME: for 'Tack'/'Gybe' angles need to figured out
          return 'Tack/Gybe';
        }
      }
      return 'Set course';
    },
    ...mapState({
      plottedSteering: state => state.boat.steering.plottedSteering,
    }),
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
      this.twa = ((value.charAt(0) !== '-') ? '+' : '') + value;
    }
  },

  methods: {
    sendSteeringCommand () {
      if (!this.canSend) {
        return;
      }
      const delayTime = this.delayTime;
      const sendParams = {
        delay: this.delayOn ? delayTime : 0,
        value: this.type === 'cc' ? this.ccRad : this.twaRad,
        command: this.type,
      };
      this.$store.dispatch('boat/steering/sendSteeringCommand', sendParams)
      .then(status => {
        if (status !== 'OK') {
          this.$store.dispatch('notifications/add', {
            text: 'Failed to send ' +
              ((sendParams.delay > 0) ? 'delayed' : 'steering') +
              ' command!',
            color: 'red',
          });
        }
        if (delayTime > 0) {
          this.$store.dispatch('boat/steering/fetchDCs');
        }
      });
    },

    onSetCourse (e) {
      this.cc = radToDeg(e.course).toFixed(3);
      this.type = 'cc';
    }
  },
  mounted () {
    if (this.type === 'cc') {
      this.$refs.cc.focus();
    } else {
      this.$refs.twa.focus();
    }
  },
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
