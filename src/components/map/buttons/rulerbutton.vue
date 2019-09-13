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
      <div
        class = "tool-button"
        ref = "del-all-button"
        v-if = "rulerEnabled || rulerSegments.length > 0"
        :style = "{color: rulerSegments.length === 0 ? 'grey' : 'black'}"
        @click.prevent = "onDelAll"
      >
        Delete All
      </div>
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
    ...mapState({
      uiModeCancel: state => state.ui.uiModeCancel,
      rulerEnabled: state => state.ui.ruler.enabled,
      rulerSegments: state => state.ui.ruler.rulerSegments,
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
</style>
