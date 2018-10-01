<template>
  <div id="steering">
    <div class="steering-input">
      <input type="radio" id="type" value="cc" v-model="type">
      COG
      <input v-model="cc">
    </div>
    <div class="steering-input">
      <input type="radio" id="type" value="twa" v-model="type">
      TWA
      <input v-model="twa">
    </div>
    <div class="steering-input">
      <input type="checkbox" id="delayOn" v-model="delayOn">
      Delay for
      <input v-model="delay">
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
      type: 'cog',
      cc: '',
      twa: '',
      delayOn: false,
      delay: '',
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
</style>
