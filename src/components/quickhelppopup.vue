<template>
  <popup-window
    class = "quick-help"
    title = "Quick Help"
    :z-index = "1005"
    close-button-label = "Close"
    @close = "doOk"
    v-if = "showHelp"
  >
    <div class = "help-header">
      Introduction
    </div>
    <div class = "help-content">
    </div>
  </popup-window>
</template>

<script>
import { mapState } from 'vuex';
import PopupWindow from './popupwindow.vue';

export default {
  name: 'QuickHelpPopup',
  components: {
    'popup-window': PopupWindow,
  },
  computed: {
    ...mapState({
      showHelp: state => state.ui.showHelp,
    }),
  },
  methods: {
    doOk: function() {
      this.$store.commit('ui/closeQuickHelp');
    },
  },
}
</script>

<style scoped>
.quick-help {
  width: 35%;
}
.help-header {
  font-size: 14px;
  font-weight: bold;
}

.help-content {
  font-size: 12px;
}
</style>
