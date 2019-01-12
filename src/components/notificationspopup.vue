<template>
  <div id="notifications-popup" v-if="this.notifications.length > 0">
    <div>
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
    <div>
      <button v-on:click = "doOk">OK</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'NotificationsPopup',
  data () {
    return {}
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
  z-index: 1000;
}
</style>
