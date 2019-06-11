<template>
  <div class="race-message-list">
    <race-message
      v-for = "racemsg in racemsgs"
      :key = "racemsg.id"
      :racemsg = "racemsg"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import RaceMessage from '../../racemessage.vue';

export default {
  name: 'ControlRaceMessages',
  components: {
    'race-message': RaceMessage,
  },
  computed: {
    ...mapState({
      racemsgs: state => state.race.messages.racemsgs,
    }),
  },
}
</script>

<style scoped>
.race-message-list {
  float: down;
  height: 100%;
  width: 100%;
  border-color: #a0a0a0;
  overflow-y: scroll;
}
</style>
