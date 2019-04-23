<template>
  <div class="race-message-list">
    <race-message
      v-for = "racemsg in this.$store.state.race.messages.racemsgs"
      :key = "racemsg.id"
      :racemsg = "racemsg"
    />
  </div>
</template>

<script>
import RaceMessage from './racemessage.vue';

export default {
  name: 'ControlRaceMessages',
  components: {
    'race-message': RaceMessage,
  },
}
</script>

<style scoped>
.race-messages {
  font-size: 12px;
  height: 100%;
  max-height: 100%;
  font-size: 9px;
  padding: 2px;
  border: 1px;
}

.race-message-list {
  float: down;
  height: 100%;
  width: 100%;
  border-color: #a0a0a0;
  overflow-y: scroll;
}
</style>
