<template>
  <popup-window
    class = "tools-popup"
    title = "Tools"
    :z-index = "1006"
    close-button-label = "Close"
    @close = "doClose"
    v-if = "showTools"
  >
    <isochrones-tool/>
    <maxvmc-tool/>
  </popup-window>
</template>

<script>
import { mapState } from 'vuex';
import PopupWindow from '../popupwindow.vue';
import IsochronesTool from './isochrones.vue';
import MaxvmcTool from './maxvmc.vue';

export default {
  name: 'ToolsPopup',
  components: {
    'popup-window': PopupWindow,
    'isochrones-tool': IsochronesTool,
    'maxvmc-tool': MaxvmcTool,
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

<style>
.tools-popup {
  min-width: 150px;
}

.tools-header {
  font-size: 14px;
  font-weight: bold;
  margin: 5px;
  margin-left: 0px;
}

.tools-content {
  font-size: 12px;
}
</style>
