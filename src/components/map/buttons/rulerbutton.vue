<template>
  <l-control
    :position = "'topleft'"
  >
    <div id = "ruler-container">
      <div
        :class = "classes"
        ref = "ruler-button"
        @click.stop.prevent = "onClick"
        @touchstart.stop.prevent = "onClick"
        @touchend.stop.prevent
      >
        Ruler
      </div>
      <transition-group name = "fade" tag="div">
        <div
          class = "tool-button tool-subbutton"
          ref = "del-last-button"
          key = "last-button"
          v-if = "canDel"
          @click.stop.prevent = "onDelLast"
          @touchstart.stop.prevent = "onDelLast"
          @touchend.stop.prevent
        >
          Delete Last
        </div>
        <div
          class = "tool-button tool-subbutton"
          ref = "del-all-button"
          key = "all-button"
          v-if = "canDel"
          @click.stop.prevent = "onDelAll"
          @touchstart.stop.prevent = "onDelAll"
          @touchend.stop.prevent
        >
          Delete All
        </div>
      </transition-group>
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
    classes () {
      return [
        'tool-button',
        this.rulerEnabled ? 'tool-button-enabled' : ''
      ];
    },
    canDel () {
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
    onDelLast () {
      this.$store.commit('ui/ruler/delSegment');
    },
    onDelAll () {
      this.$store.commit('ui/ruler/delAll');
    },
  },
  mounted () {
    L.DomEvent.disableClickPropagation(this.$refs['ruler-button']);
  },
  updated () {
    if (typeof this.$refs['del-last-button'] !== 'undefined') {
      L.DomEvent.disableClickPropagation(this.$refs['del-last-button']);
    }
    if (typeof this.$refs['del-all-button'] !== 'undefined') {
      L.DomEvent.disableClickPropagation(this.$refs['del-all-button']);
    }
  },
}
</script>

<style scoped>
#ruler-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: crosshair;
}

.tool-subbutton {
  margin-top: 2px;
  margin-left: 10px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.7s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
