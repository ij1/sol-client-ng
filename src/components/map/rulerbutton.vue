<template>
  <l-control
    :position = "'topleft'"
  >
    <div
      class = "tool-button"
      ref = "ruler-button"
      :style = "{color: rulerEnabled ? 'red' : 'black'}"
      @click.prevent = "onClick"
    >
      Ruler
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
  },
  mounted () {
    L.DomEvent.disableClickPropagation(this.$refs['ruler-button']);
  },
}
</script>
