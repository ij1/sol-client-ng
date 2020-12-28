<template>
  <popup-window
    class = "tools-popup"
    title = "Tools"
    :z-index = "1006"
    close-button-label = "Close"
    @close = "doClose"
    v-if = "showTools"
  >
    <button
      :disabled = "!allowIsochrones"
      @click.prevent = "isochrone('cog')"
      @keydown.enter.prevent = "isochrone('cog')"
    >
      COG isochrones
    </button>
    <button
      :disabled = "!allowIsochrones"
      @click.prevent = "isochrone('twa')"
      @keydown.enter.prevent = "isochrone('twa')"
    >
      TWA isochrones
    </button>
    <button
      @click.prevent = "clearIsochrones"
      @keydown.enter.prevent = "clearIsochrones"
    >
      Clear isochrones
    </button>
  </popup-window>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import PopupWindow from '../popupwindow.vue';

export default {
  name: 'ToolsPopup',
  components: {
    'popup-window': PopupWindow,
  },
  computed: {
    allowIsochrones () {
      return this.wxValid && this.raceLoaded &&
             this.isochroneCalculating === null;
    },
    ...mapState({
      showTools: state => state.ui.showTools,
      raceLoaded: state => state.race.loaded,
      isochroneCalculating: state => state.ui.tools.isochroneCalculating,
    }),
    ...mapGetters({
      wxValid: 'weather/valid',
    }),
  },
  methods: {
    doClose: function() {
      this.$store.commit('ui/closeTools');
    },
    isochrone (type) {
      this.$store.commit('ui/tools/clearIsochrones', type);
      this.$store.dispatch('ui/tools/calculateIsochrone', type);
    },
    clearIsochrones () {
      this.$store.commit('ui/tools/clearIsochrones', 'cog');
      this.$store.commit('ui/tools/clearIsochrones', 'twa');
    },
  },
}
</script>

<style scoped>
.tools-popup {
  width: 10%;
}
</style>
