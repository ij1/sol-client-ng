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
#notifications-popup {
  position: absolute;
  left: 50%;
  top: 50%;
  margin-right: -50%;
  min-width: 500px;
  transform: translate(-50%, -50%);
  padding: 10px;
  border: solid 3px;
  border-radius: 10px;
  border-color: #808080;
  background: #fff;
  text-align: left;
  z-index: 1001;
}
#notifications-content {
  overflow-y: auto;
}
</style>
