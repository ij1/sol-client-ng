<template>
  <l-control
    :position = "'topleft'"
  >
    <div id = "steer-button" ref = "steer-button" @click.prevent = "onClick">
      Steer
    </div>
  </l-control>
</template>

<script>
import L from 'leaflet';
import { mapState } from 'vuex';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'SteerButton',
  components: {
    'l-control': LControl,
  },
  computed: {
    ...mapState({
      visualShowPolar: state => state.boat.steering.cfg.alwaysShowPolar.value,
      alwaysShowPolar: state => state.boat.instruments.cfg.visualizePolar.value,
      visualSteeringEnabled: state => state.boat.steering.visualSteering.enabled,
      showPolar: state => state.boat.steering.visualSteering.showPolar,
      boatPosition: state => state.boat.position,
    }),
  },
  methods: {
    onClick () {
      if (this.boatPosition) {
        let showPolar = this.alwaysShowPolar || this.visualShowPolar;
        if (this.visualSteeringEnabled) {
          if (this.showPolar) {
             this.$store.commit('boat/steering/visualSteeringOff');
             return;
          }
          showPolar = true;
        } else {
          this.$store.commit('ui/setActiveTab', 0);
        }
        this.$store.commit('boat/steering/visualSteering', showPolar);
      }
    },
  },
  mounted () {
    L.DomEvent.disableClickPropagation(this.$refs['steer-button']);
  },
}
</script>

<style scoped>
#steer-button {
  background-color: rgb(240, 240, 240, 0.8);
  border: 1px;
}
</style>
