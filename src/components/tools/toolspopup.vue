<template>
  <popup-window
    class = "tools-popup"
    title = "Tools"
    :z-index = "1006"
    close-button-label = "Close"
    @close = "doClose"
    v-if = "showTools"
  >
    
  </popup-window>
</template>

<script>
import { mapState } from 'vuex';
import PopupWindow from '../popupwindow.vue';

export default {
  name: 'ToolsPopup',
  components: {
    'popup-window': PopupWindow,
  },
  computed: {
    ...mapState({
      showTools: state => state.ui.showTools,
    }),
  },
  methods: {
    doClose: function() {
      this.$store.commit('ui/closeTools');
    },
  },
}
</script>

<style scoped>
.tools-popup {
  width: 10%;
}
</style>
