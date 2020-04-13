<template>
  <l-control
    :position = "'topleft'"
  >
    <div
      :class = "classes"
      ref = "steer-button"
      @click.stop.prevent = "onClick"
      @touchstart.stop.prevent = "onClick"
      @touchend.stop.prevent
    >
      Steer
    </div>
  </l-control>
</template>

<script>
import L from 'leaflet';
import { mapState, mapGetters } from 'vuex';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'SteerButton',
  components: {
    'l-control': LControl,
  },
  computed: {
    classes () {
      return [
        'tool-button',
        this.visualSteeringEnabled ? 'tool-button-enabled' :
          (!this.allowControl ? 'tool-button-disabled' : '')
      ];
    },
    ...mapState({
      visualShowPolar: state => state.boat.steering.cfg.showPolarImmediately.value,
      alwaysShowPolar: state => state.boat.instruments.cfg.visualizePolar.value,
      visualSteeringEnabled: state => state.boat.steering.visualSteering.enabled,
      showPolar: state => state.boat.steering.visualSteering.showPolar,
      boatPosition: state => state.boat.position,
    }),
    ...mapGetters({
      allowControl: 'boat/allowControl',
    }),
  },
  methods: {
    onClick () {
      if (!this.allowControl || (this.boatPosition === null)) {
        return;
      }

      let newMode = 'boat/steering/visualSteering';
      let showPolar = this.alwaysShowPolar || this.visualShowPolar;
      if (this.visualSteeringEnabled) {
        if (this.showPolar) {
           newMode = 'boat/steering/visualSteeringOff';
           showPolar = null;
        } else {
          showPolar = true;
        }
      } else {
        this.$store.commit('ui/setActiveTab', 0);
      }

      this.$store.dispatch('ui/setUiMode', {
        cancel: 'boat/steering/visualSteeringOff',
        newMode: newMode,
        param: showPolar,
      });
    },
  },
  mounted () {
    L.DomEvent.disableClickPropagation(this.$refs['steer-button']);
  },
}
</script>
