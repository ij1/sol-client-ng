<template>
  <div id="steering">
    <div class="steering-input">
      <input type="radio" id="type" value="cc" v-model="type">
      <label for="cc" @click="type = 'cc'">COG</label>
      <input id="cc" @click="type = 'cc'" v-model.trim="cc">
    </div>
    <div class="steering-input">
      <input type="radio" id="type" value="twa" v-model="type">
      <label for="twa" @click="type = 'twa'">TWA</label>
      <input id="twa" @click="type = 'twa'" v-model.trim="twa">
    </div>
    <div class="steering-input">
      <input type="checkbox" id="delayOn" v-model="delayOn">
      <label for="delay" @click="delayOn = true">Delay for</label>
      <input id="delay" v-model.trim="delay">
    </div>
    <div>
      <button @click="sendSteeringCommand">{{applySteeringTxt}}</button>
    </div>
    <control-steering-polar/>
  </div>
</template>

<script>
import ControlSteeringPolar from './ControlSteeringPolar.vue';

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
    }
  },

  computed: {
    isDelayValid () {
      // ADDME: parse 1h10m format too
      const delay = parseFloat(this.delay);
      return (Number.isFinite(delay) && delay >= 0);
    },
    delayTime () {
      if (!this.delayOn && !this.isDelayValid) {
        return null;
      }

      const delay = parseFloat(this.delay);
      if (delay > 0) {
        return delay;
      } else {
        return null;
      }
    },

    applySteeringTxt () {
      if (this.delayOn && this.delayTime !== null) {
        return 'Send command';
      }
      return 'Change course';
    }
  },

  methods: {
    sendSteeringCommand () {

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
</style>
