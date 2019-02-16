<template>
  <div class="race-message">
    <div class="race-message-flag">
      <lima-flag :size = "28"/>
    </div>
    <div class="race-message-title">
      <span v-html="racemsg.title"/>
    </div>
    <div class="race-message-datetime">
      {{ msecToUTCString(racemsg.lastUpdated) }}
    </div>
    <div class="race-message-msg">
      <span v-html="racemsg.message"/>
    </div>
  </div>
</template>

<script>
import { msecToUTCString } from '../../../lib/utils.js';
import LimaFlag from '../../limaflag.vue';

export default {
  name: 'RaceMessage',
  components: {
    'lima-flag': LimaFlag,
  },
  props: {
    racemsg: {
      type: Object,
      required: true,
    },
  },
  methods: {
    msecToUTCString: msecToUTCString,
  },

  data () {
    return {}
  },
}
</script>

<style scoped>
.race-message {
  text-align: left;
  border-bottom: solid 1px;
}
.race-message:last-child {
  border-bottom: 0px;
}
.race-message-flag {
  float: left;
  margin: 2px;
}
.race-message-title {
  font-size: 14px;
  font-weight: bold;
}
.race-message-datetime {
  font-size: 12px;
}
.race-message-msg {
  padding: 2px;
  padding-bottom: 5px;
  border-bottom: 1px;
  font-size: 11px;
}
</style>
