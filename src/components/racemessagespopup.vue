<template>
  <popup-window
    title = "Notice"
    :z-index = "1011"
    close-button-label = "OK"
    @close = "doOk"
    v-if="pendingRacemsgs.length > 0"
  >
    <div>
      <race-message
        v-for = "racemsg in pendingRacemsgs"
        :key = "racemsg.id"
        :racemsg = "racemsg"
      />
    </div>
  </popup-window>
</template>

<script>
import { mapState } from 'vuex';
import PopupWindow from './popupwindow.vue';
import RaceMessage from './racemessage.vue';

export default {
  name: 'RaceMessagesPopup',
  components: {
    'popup-window': PopupWindow,
    'race-message': RaceMessage,
  },
  computed: {
    pendingRacemsgs () {
      return this.racemsgs.filter(i => i.id > this.shownId);
    },
    ...mapState({
      shownId: state => state.race.messages.uiShownId,
      racemsgs: state => state.race.messages.racemsgs,
    }),
  },
  methods: {
    doOk: function() {
      this.$store.dispatch('race/messages/updateShownId');
    }
  },
}
</script>
