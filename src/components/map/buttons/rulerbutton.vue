<template>
  <l-control
    :position = "'topleft'"
  >
    <div id = "ruler-container">
      <div
        class = "tool-button"
        ref = "ruler-button"
        :style = "{color: rulerEnabled ? 'red' : 'black'}"
        @click.prevent = "onClick"
      >
        Ruler
      </div>
      <transition name = "fade">
        <div
          class = "tool-button"
          ref = "del-all-button"
          v-if = "canDelAll"
          @click.prevent = "onDelAll"
        >
          Delete All
        </div>
      </transition>
    </div>
  </l-control>
</template>

<script>
import L from 'leaflet';
import { mapState } from 'vuex';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'RulerButton',
  components: {
    'l-control': LControl,
  },
  computed: {
    canDelAll () {
      return (this.rulerSegments.length > 0) ||
             (this.rulerPendingPosition !== null);
    },
    ...mapState({
      uiModeCancel: state => state.ui.uiModeCancel,
      rulerEnabled: state => state.ui.ruler.enabled,
      rulerSegments: state => state.ui.ruler.rulerSegments,
      rulerPendingPosition: state => state.ui.ruler.rulerPendingPosition,
    }),
  },
  methods: {
    onClick () {
      let newMode = 'ui/ruler/' + (!this.rulerEnabled ? 'on' : 'off');
      this.$store.dispatch('ui/setUiMode', {
        cancel: 'ui/ruler/off',
        newMode: newMode,
      });
    },
    onDelAll () {
      this.$store.commit('ui/ruler/delAll');
    },
  },
  mounted () {
    L.DomEvent.disableClickPropagation(this.$refs['ruler-button']);
  },
  updated () {
    if (typeof this.$refs['del-all-button'] !== 'undefined') {
      L.DomEvent.disableClickPropagation(this.$refs['del-all-button']);
    }
  },
}
</script>

<style scoped>
#ruler-container {
  display: flex;
  flex-direction: row;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.7s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
