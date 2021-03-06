<template>
  <popup-window
    title = "Edit Delayed Command"
    :z-index = "1001"
    close-button-label = "Cancel"
    @close = "$emit('close')"
    submit-button-label = "Update"
    @submit = "onChange"
    :can-submit = "canSend"
    content-overflow = "visible"
  >
    <div>
      <label class="dc-editor-label">Date</label>
      <datepicker
        v-model = "time"
        format = "yyyy/MM/dd"
        input-class = "dc-editor-date-input"
        :use-utc = "true"
        :typeable = "true"
        :disabled-dates = "disabledDates"
      />
    </div>
    <div>
      <label for="time" class="dc-editor-label">Time</label>
      <input
        id = "time"
        v-model = "hours"
        maxlength = 8
        size = 8
      />
    </div>
    <div>
      <label class="dc-editor-label">Type</label>
      <span>
        <input type="radio" id="cog" value="cc" v-model="type"/>
        <label for="cog">COG</label>
        <input type="radio" id="twa" value="twa" v-model="type"/>
        <label for="twa">TWA</label>
      </span>
    </div>
    <div>
      <label for="value" class="dc-editor-label">Value</label>
      <input
        :style = "{'background-color': twaColor}"
        id = "value"
        v-model.trim = "valueRaw"
        size = 8
        maxlength = 8
      />&deg;
    </div>
  </popup-window>
</template>

<script>
import { mapGetters } from 'vuex';
import Datepicker from 'vuejs-datepicker';
import { radToDeg, degToRad, msecToH, msecToUTCDateString, msecToUTCTimeString, UTCToMsec } from '../../../lib/utils.js';
import { roundToFixed } from '../../../lib/quirks.js';
import { isCcValid, isTwaValid, dcTwaTextPrefix } from '../../../lib/nav.js';
import PopupWindow from '../../popupwindow.vue';

export default {
  name: 'DCEditor',
  components: {
    'datepicker': Datepicker,
    'popup-window': PopupWindow,
  },
  props: {
    dcToEdit: {
      type: Object,
    },
  },
  data () {
    return {
      time: this.dcToEdit.time,
      hours: msecToUTCTimeString(this.dcToEdit.time),
      type: this.dcToEdit.type,
      valueRaw: dcTwaTextPrefix(this.dcToEdit) +
                roundToFixed(radToDeg(this.dcToEdit.value), 3),
      origDc: Object.assign({}, this.dcToEdit),
      sending: false,
    }
  },
  computed: {
    value () {
      return this.valueRaw.replace(',', '.');
    },
    newTime () {
      const date = msecToUTCDateString(this.time) + ' ' + this.hours;
      return UTCToMsec(date);
    },
    canSend () {
      return !this.sending && this.valid && this.dirty &&
             (this.newTime !== null) && (this.boatTime <= this.newTime);
    },
    disabledDates () {
      let today = new Date(this.boatTime);
      today.setUTCHours(0, 0, 0, 0);
      return {
        to: today,
      }
    },
    dirty () {
      if (!this.valid) {
        return false;
      }
      // FIXME: check also 0.000 -> 0.0 trailing zeros changes
      return (this.origDc.time !== this.newTime) ||
             (this.origDc.type !== this.type) ||
             ((dcTwaTextPrefix(this.origDc) +
               roundToFixed(radToDeg(this.origDc.value), 3)) !== this.value);
    },
    valid () {
      if (this.newTime === null) {
        return false;
      }
      if (this.type === 'cc') {
        return isCcValid(this.value);
      } else if (this.type === 'twa') {
        return isTwaValid(this.value);
      } else {
        return false;
      }
    },
    twaColor () {
      if (this.type !== 'twa') {
        return 'unset';
      } else if (!isTwaValid(this.value)) {
        return 'unset';
      }
      const num = Number(this.value);
      if (num === 0) {
        return 'unset';
      } else if (num < 0) {
        return 'red';
      } else {
        return '#7fff00';
      }
    },
    ...mapGetters({
      boatTime: 'boat/time',
    }),
  },
  methods: {
    onChange () {
      if (this.canSend) {
        this.sendChange();
      }
    },
    sendChange() {
      const now = this.$store.getters['time/now']();
      // FIXME: is 500 msecs correction ok or should it be something else?
      let timeDelta = Math.max(this.newTime - now - 500, 0);
      this.sending = true;

      Promise.all([
        this.$store.dispatch('boat/steering/sendSteeringCommand', {
          delay: msecToH(timeDelta),
          command: this.type,
          value: degToRad(this.value),
        }),
        this.$store.dispatch('boat/steering/sendDeleteDC', {
          id: this.origDc.id
        }),
      ])
      .then(status => {
        if ((status[0] === 'OK') && (status[1] === 'OK')) {
          this.$emit('close');
        } else {
          this.sending = false;
          this.$store.dispatch('notifications/add', {
            text: 'DC change failed, please check your DCs!',
            color: 'red',
          });
        }
        this.$store.dispatch('boat/steering/fetchDCs');
      });
    },
  },
}
</script>

<style scoped>
.dc-editor-label {
  width: 30%;
  float: left;
  text-align: left;
}
</style>

<style>
.dc-editor-date-input {
  width: 50%;
}
</style>
