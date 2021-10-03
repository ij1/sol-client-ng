<template>
  <l-control
    :position = "'bottomright'"
    :disableClickPropagation = "false"
  >
    <div id = "quick-access-dcs-container">
      <transition-group name = "fade" tag = "div">
        <div
          :class = "dcClasses"
          ref = "quick-access-dcs"
          key = "qa-dcs"
          v-if = "cfgPredictorDcs"
          @click.stop.prevent = "onDcs"
          @touchstart.stop.prevent = "onDcs"
          @touchend.stop.prevent
        >
          DC markers
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
  name: 'DCsQuickAccessButton',
  components: {
    'l-control': LControl,
  },
  computed: {
    dcClasses () {
      return [
        'tool-button',
        'tool-subbutton',
        this.dcMarkerVisibility ? 'tool-button-enabled' : '',
      ];
    },
    ...mapState({
      cfgPredictorDcs: state => state.boat.steering.cfg.predictorDcs.value,
      dcMarkerVisibility: state => state.boat.steering.dcs.markerVisibility,
    }),
  },
  methods: {
    onDcs () {
      this.$store.commit('boat/steering/setDCMarkerVisibility',
                         !this.dcMarkerVisibility);
    },
  },
  updated () {
   if (typeof this.$refs['quick-access-dcs'] !== 'undefined') {
     L.DomEvent.disableClickPropagation(this.$refs['quick-access-dcs']);
   }
 },
}
</script>

<style scoped>
#quick-access-dcs-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: crosshair;
}

.tool-subbutton {
  margin-top: 2px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.7s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
