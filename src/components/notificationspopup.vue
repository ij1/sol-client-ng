<template>
  <popup-window
    title = ""
    :z-index = "1010"
    close-button-label = "OK"
    @close = "doOk"
    v-if="this.notifications.length > 0"
  >
    <div id="notifications-content">
      <div
        v-for = "notification in this.notifications"
        :key = "notification.id"
        class = "notification-line"
      >
        <span
          v-html = "notification.text"
          :style = "{ color:  notification.color }"
        />
      </div>
    </div>
  </popup-window>
</template>

<script>
import { mapState } from 'vuex';
import PopupWindow from './popupwindow.vue';

export default {
  name: 'NotificationsPopup',
  components: {
    'popup-window': PopupWindow,
  },
  computed: {
    ...mapState({
      notifications: state => state.notifications.notifications,
    }),
  },

  methods: {
    doOk: function() {
      this.$store.commit('notifications/clear');
    }
  }
}
</script>

<style scoped>
#notifications-content {
  overflow-y: auto;
}
</style>
