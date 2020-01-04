<template>
  <div id="steering">
    <form @submit.prevent = "sendSteeringCommand">
      <fieldset :disabled="!allowControl">
        <div class = "steering-input">
          <input
            type = "radio"
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
            @input = "type = 'cc'"
            v-model.trim = "ccRaw"
            maxlength = 7
            size = 7
          >&deg;
          <div class = "input-error">
            <transition name = "fade">
              <span v-if = "ccError !== null">
                {{ccError}}
              </span>
            </transition>
          </div>
        </div>
        <div class = "steering-input">
          <input
            type = "radio"
            value = "twa"
            v-model = "type"
            @click = "$refs.twa.focus()"
          >
          <label for = "twa" @click = "type = 'twa'">TWA</label>
          <input
            class = "steering-input-box"
            :style = "{'background-color': twaColor}"
            ref = "twa"
            id = "twa"
            @click = "type = 'twa'"
            @input = "type = 'twa'"
            v-model.trim = "twaRaw"
            maxlength = 8
            size = 8
          >&deg;
          <div class = "input-error">
            <transition name = "fade">
              <span v-if = "twaError !== null">
                {{twaError}}
              </span>
            </transition>
          </div>
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
            v-model.trim = "delayRaw"
            maxlength = 12
            size = 12
          >
          <div class = "input-error">
            <transition name = "fade">
              <span v-if = "delayError !== null">
                {{delayError}}
              </span>
            </transition>
          </div>
        </div>
        <div id = "steering-buttons">
          <button type = "submit" :disabled = "!canSend">
            {{applySteeringTxt}}
          </button>
          <button
            type = "button"
            @click.prevent = "recallCurrent"
            :disabled = "!allowControl">
            Reset
          </button>
        </div>
      </fieldset>
    </form>
    <polar-container class="flex-space"/>
    <syc-banner class = "bottom-banner"/>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import PolarContainer from './polarcontainer.vue';
import SycBanner from '../../sycbanner.vue';
import { radToDeg, degToRad, msecToH } from '../../../lib/utils.js';
import { roundToFixed } from '../../../lib/quirks.js';
import { isCcValid, isTwaValid, twaTextPrefix } from '../../../lib/nav.js';

const dayHourMinSecRegex = /^([1-9][0-9]*d)?([0-9][0-9]*h)?([0-9][0-9]*m)?([0-9][0-9]*s)?$/;

// FIXME: The values should probably use some arbitary precision library
// to avoid unexpected rounding with floating-points.
// CHECKME: How negative TWA should be rounded? Up or down?

export default {
  name: 'ControlSteering',
  components: {
    'polar-container': PolarContainer,
    'syc-banner': SycBanner,
  },
  data () {
    return {
      sending: false,
    };
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
    ccRaw: {
      get () {
        return this.plottedSteering.cc;
      },
      set (value) {
        this.$store.commit('boat/steering/setCc', value);
      },
    },
    twaRaw: {
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
    delayRaw: {
      get () {
        return this.plottedSteering.delay;
      },
      set (value) {
        this.$store.commit('boat/steering/setDelay', value);
      },
    },
    cc () {
      return this.ccRaw.replace(',', '.');
    },
    twa () {
      return this.twaRaw.replace(',', '.');
    },
    delay () {
      return this.delayRaw.replace(',', '.');
    },
    prevCopyDecimals () {
      return this.plottedSteering.prevCopyDecimals;
    },

    canSend () {
      return this.allowControl &&
        (!this.delayOn || this.isDelayValid) && this.isSteeringValid &&
        !this.sending;
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
      return Number(roundToFixed(radToDeg(twd), this.copyDecimals));
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

    isDelayNumber () {
      if (this.cfgExtraDebug) {
        this.debugIsDelayNumber();
      }
      const regex = /^\d+(\.\d+)?$/;
      if (!regex.test(this.delay)) {
        return false;
      }
      const delay = parseFloat(this.delay);
      return (Number.isFinite(delay) && delay >= 0);
    },
    isDelayStart () {
      return (this.delay.toLowerCase() === 'start') &&
             !this.$store.getters['race/isRaceStarted'];
    },
    isDelayHourMin () {
      const d = dayHourMinSecRegex.exec(this.delay);
      return (d !== null) && (d[0].length > 0);
    },
    isDelayValid () {
      return this.isDelayNumber || this.isDelayStart || this.isDelayHourMin;
    },
    delayTime () {
      if (!this.delayOn || !this.isDelayValid) {
        return null;
      }
      if (this.isDelayNumber) {
        return parseFloat(this.delay);
      }
      if (this.isDelayStart) {
        if (this.$store.getters['race/isTowbackPeriod']) {
          return 0;
        } else {
          const now = this.$store.getters['time/now']();
          const towbackPeriod = this.$store.getters['race/towbackPeriod'];

          const delay = Math.max((towbackPeriod.end - towbackPeriod.start) * 0.8 *
                          Math.random() +
                          towbackPeriod.start - now, 0);
          return msecToH(delay);
        }
      }
      if (this.isDelayHourMin) {
        let d = dayHourMinSecRegex.exec(this.delay);
        let res = 0;
        if (typeof d[1] !== 'undefined') {
          res += +(d[1].substring(0, d[1].length - 1)) * 24;
        }
        if (typeof d[2] !== 'undefined') {
          res += +(d[2].substring(0, d[2].length - 1));
        }
        if (typeof d[3] !== 'undefined') {
          res += +(d[3].substring(0, d[3].length - 1)) / 60.0;
        }
        if (typeof d[4] !== 'undefined') {
          res += +(d[4].substring(0, d[4].length - 1)) / 3600.0;
        }
        return res;
      }

      /* Should never be reached */
      return null;
    },

    isSteeringValid () {
      return ((this.type === 'cc') && this.isCcValid) ||
             ((this.type === 'twa') && this.isTwaValid);
    },

    toTwa () {
      if (!this.isCcValid) {
        return null;
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

      return roundToFixed(diff, this.copyDecimals);
    },
    toCc () {
      if (!this.isTwaValid) {
        return null;
      }
      const twa = parseFloat(this.twa);
      let diff = this.ccTwaDelta - twa;
      if (diff < 0) {
        diff += 360.0;
      } else if (diff >= 360.0) {
        diff -= 360.0;
      }
      return roundToFixed(diff, this.copyDecimals);
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


    ccRad () {
      return degToRad(this.cc);
    },
    twaRad () {
      return degToRad(this.twa);
    },

    applySteeringTxt () {
      if (this.delayOn && this.isDelayValid && this.delayTime > 0) {
        return 'Send Command';
      } else if (this.isSteeringValid) {
        if ((Math.abs(this.oldTwa) > 0) && (Math.abs(this.twa) > 0) &&
            (Math.sign(this.oldTwa) !== Math.sign(this.twa))) {
          // ADDME: for 'Tack'/'Gybe' angles need to figured out
          return 'Tack/Gybe';
        }
      }
      return 'Set Boat Course';
    },
    ccError () {
      if (this.isCcValid || (this.cc === '') || (this.type !== 'cc')) {
        return null;
      }
      return "Enter 0.0 \u2013 360.0!"
    },
    twaHasSign () {
      const firstChar = this.twa.charAt(0);
      return (firstChar === '-') || (firstChar === '+');
    },
    twaError () {
      if (this.isTwaValid || (this.twa === '') || (this.type !== 'twa')) {
        return null;
      }
      let errorMsg = "Enter -180.0 \u2013 +180.0!";
      if (!this.twaHasSign) {
        errorMsg += "  Non-zero needs sign!";
      }
      return errorMsg;
    },
    delayError () {
      if (this.isDelayValid) {
        return null;
      }
      if (this.delay === '') {
        return null;
      }
      return "Enter decimal (hours) or as components 0h00m00s!";
    },
    ...mapState({
      plottedSteering: state => state.boat.steering.plottedSteering,
      cfgExtraDebug: state => state.diagnostics.cfg.extraDebug.value,
    }),
    ...mapGetters({
      allowControl: 'boat/allowControl',
    }),
  },

  watch: {
    toCc (value) {
      if ((this.type === 'cc') || (value === null)) {
        return;
      }
      this.ccRaw = value;
    },
    toTwa (value) {
      if ((this.type === 'twa') || (value === null)) {
        return;
      }
      this.twaRaw = twaTextPrefix(value) + value;
    },
    delayTime (value) {
      /* Don't show the DC dot when "start" is used as the delay */
      this.$store.commit('boat/steering/setDelayTime',
                         !this.isDelayStart ? value : null);
    },
  },

  methods: {
    sendSteeringCommand () {
      if (!this.canSend) {
        return;
      }
      const delayTime = this.delayTime;
      const delayValue = this.delayOn ? delayTime : 0;
      const cmdValue = this.type === 'cc' ? this.ccRad : this.twaRad;
      const sendParams = {
        delay: delayValue,
        value: cmdValue,
        command: this.type,
      };
      this.sending = true;
      const steeringTxt = this.type + '=' +
                           radToDeg(cmdValue) + ' ' +
                           (this.delayOn ? ('DC=' + delayValue) : '');
      this.$store.dispatch('diagnostics/add', 'INFO: steering SEND ' + steeringTxt);
      this.$store.dispatch('boat/steering/sendSteeringCommand', sendParams)
      .then(status => {
        if (status !== 'OK') {
          this.$store.dispatch('notifications/add', {
            text: 'Failed to send ' +
              ((sendParams.delay > 0) ? 'delayed' : 'steering') +
              ' command!',
            color: 'red',
          });
          this.$store.dispatch('diagnostics/add', 'INFO: steering FAIL ' + steeringTxt);
        } else {
          this.$store.dispatch('diagnostics/add', 'INFO: steering OK ' + steeringTxt);
        }
        if (delayTime > 0) {
          this.$store.dispatch('boat/steering/fetchDCs');
        }
      })
      .finally(() => {
        this.sending = false;
      });
    },

    onSetCourse (e) {
      this.cc = roundToFixed(radToDeg(e.course), 3);
      this.type = 'cc';
    },

    recallCurrent () {
      const currentType = this.$store.state.boat.currentSteering;
      this.type = currentType;
      if (currentType === 'cc') {
        this.ccRaw = roundToFixed(radToDeg(this.$store.state.boat.instruments.course.value), 3);
      } else if (currentType === 'twa') {
        const twaVal = this.$store.state.boat.instruments.twa.value;
        this.twaRaw = twaTextPrefix(twaVal) + roundToFixed(radToDeg(twaVal), 3);
      }
    },
    debugIsDelayNumber () {
      const regex = /^\d+(\.\d+)?$/;
      const asHex = this.delay.split("").reduce((res, c) => res += c.charCodeAt(0).toString(16).padStart(4,"0"),"");
      this.$store.dispatch('diagnostics/add', 'IsDelayNumber: for "' + this.delay + '" (' + asHex + ') ' +
                           'regex: ' + regex.test(this.delay) + ' ' +
                           'parseFloat: ' + parseFloat(this.delay) + ' ' +
                           'isFinite: ' + Number.isFinite(parseFloat(this.delay)));
    },
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
  font-size: 12px;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.steering-input {
  text-align: left;
}
input[type=checkbox], input[type=radio] {
  vertical-align: middle;
  position: relative;
  bottom: 2px;
}
input[type=radio] {
  bottom: 3px;
}
.steering-input-box {
  font-size: 12px;
  font-weight: bold;
  background-color: white;
  margin: 2px;
  margin-left: 6px;
}
.flex-space {
  flex: auto;
}
.bottom-banner {
  position: relative;
  bottom: 0px;
  left: 0px;
}
#steering-buttons button {
  margin-left: 4px;
  padding: 0px;
}
.input-error {
  text-align: left;
  font-size: 11px;
  height: 20px;
  margin-left: 5px;
  color: red;
  overflow: hidden;
}
.fade-enter-active {
  transition: opacity 0.1s linear 0.3s;
}
.fade-leave-active {
  transition: opacity 0.1s linear;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
