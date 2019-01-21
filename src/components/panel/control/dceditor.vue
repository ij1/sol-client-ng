<template>
  <div id="dc-editor" v-if="!this.closed">
    <div>
      Edit Delayed Command
    </div>
    <div>
      <label class="dc-editor-label">Date</label>
      <datepicker
        v-model = "time"
        format = "yyyy/MM/dd"
        input-class = "dc-editor-date-input"
        :use-utc = "true"
	:typeable = "true"
        :disabledDates = "disabledDates"
      />
    </div>
    <div>
      <label class="dc-editor-label">Time</label>
      <input
        v-model = "hours"
        maxlength = 8
        size = 8
      >
    </div>
    <div>
      <label class="dc-editor-label">Type</label>
      <span>
        <input type="radio" id="type" value="cc" v-model="type">COG
        <input type="radio" id="type" value="twa" v-model="type">TWA
      </span>
    </div>
    <div>
      <label class="dc-editor-label">Value</label>
      <input
        id = "value"
        v-model.trim = "value"
        size = 8
        maxlength = 8
      >&deg;
    </div>
    <div>
      <button @click="onCancel">
        Cancel
      </button>
      <button @click="onChange" :disabled="!canSend">
        Change
      </button>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import Datepicker from 'vuejs-datepicker';
import { radToDeg, degToRad, msecToH, msecToUTCDateString, msecToUTCTimeString, UTCToMsec } from '../../../lib/utils.js';

export default {
  name: 'DCEditor',
  components: {
    'datepicker': Datepicker,
  },
  props: {
    dcToEdit: {
      type: Object,
    },
    /* Vue portal hides the real parent, thus, pass it for us */
    realParent: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      time: this.dcToEdit.time,
      hours: msecToUTCTimeString(this.dcToEdit.time),
      type: this.dcToEdit.type,
      value: radToDeg(this.dcToEdit.value).toFixed(3),
      origDc: Object.assign({}, this.dcToEdit),
      closed: false,
    }
  },
  computed: {
    newTime () {
      const date = msecToUTCDateString(this.time) + ' ' + this.hours;
      return UTCToMsec(date);
    },
    canSend () {
      return this.valid && this.dirty && (this.newTime !== null) &&
             !this.$store.state.boat.steering.sending;
    },
    disabledDates () {
      let today = new Date(this.boatTime);
      today.setUTCHours(0, 0, 0, 0);
      return {
        to: today,
      }
    },
    dirty () {
      // FIXME: check also 0.000 -> 0.0 trailing zeros changes
      return (this.origDc.time !== this.newTime) ||
             (this.origDc.type !== this.type) ||
             (radToDeg(this.origDc.value).toFixed(3) !== this.value);
    },
    valid () {
      // FIXME: take common code from steering e.g. to nav.js
      return true;
    },
    ...mapGetters({
      boatTime: 'boat/time',
    }),
  },
  methods: {
    close () {
      this.closed = true;
      this.realParent.dcToEdit = null;
    },
    onCancel () {
      this.close();
    },
    onChange () {
      if (this.canSend) {
        this.sendChange();
      }
    },
    sendChange() {
      const now = this.$store.getters['time/now']();
      // FIXME: is 500 msecs correction ok or should it be something else?
      let timeDelta = Math.max(this.newTime - now - 500, 0);

      Promise.all([
        this.$store.dispatch('boat/steering/sendDeleteDC', {
          id: this.origDc.id
        }),
        this.$store.dispatch('boat/steering/sendSteeringCommand', {
          delay: msecToH(timeDelta),
          command: this.type,
          value: degToRad(this.value),
        }),
      ])
      .then(status => {
        if ((status[0] === 'OK') && (status[1] === 'OK')) {
          this.close();
        } else {
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
#dc-editor {
  position: fixed;
  top: 50%;
  left: 50%;
  margin-right: -50%;
  transform: translate(-50%, -50%);
  padding: 10px;
  border: solid 3px;
  border-radius: 10px;
  border-color: #808080;
  background: #fff;
  z-index: 1000;
  text-align: left;
}
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