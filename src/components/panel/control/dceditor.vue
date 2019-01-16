<template>
  <div id="dc-editor" v-if="!this.closed">
    <div>
      Edit Delayed Command
    </div>
    <div>
      {{ this.time }}
    </div>
    <div>
      <input type="radio" id="type" value="cc" v-model="type">COG
      <input type="radio" id="type" value="twa" v-model="type">TWA
    </div>
    <div>
      <input id="value" v-model.trim="value" size=8 maxlength=8>
    </div>
    <div>
      <button @click="onChange">
        Change
      </button>
      <button @click="onCancel">
        Cancel
      </button>
    </div>
  </div>
</template>

<script>
import { radToDeg, degToRad, toH } from '../../../lib/utils.js';

export default {
  name: 'DCEditor',
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
      type: this.dcToEdit.type,
      value: radToDeg(this.dcToEdit.value).toFixed(3),
      origDc: Object.assign({}, this.dcToEdit),
      closed: false,
    }
  },
  computed: {
    canSend () {
      return this.valid && this.dirty &&
             !this.$store.state.boat.steering.sending;
    },
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
    dirty () {
      return (this.origDc.time !== this.time) ||
             (this.origDc.type !== this.type) ||
             (radToDeg(this.origDc.value) !== this.value);
    },
    valid () {
      // FIXME: take common code from steering e.g. to nav.js
      return true;
    },
    sendChange() {
      const now = this.$store.getters['time/now']();
      // FIXME: is 500 msecs correction ok or should it be something else?
      let timeDelta = Math.max(this.time - now - 500, 0);

      Promise.all([
        this.$store.dispatch('boat/steering/sendDeleteDC', {
          id: this.origDc.id
        }),
        this.$store.dispatch('boat/steering/sendSteeringCommand', {
          delay: toH(timeDelta),
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
}
</style>
