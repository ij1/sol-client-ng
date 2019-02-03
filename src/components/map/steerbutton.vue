<template>
  <l-control
    :position = "'topleft'"
  >
    <div @click = "onClick">
      Steer
    </div>
  </l-control>
</template>

<script>
import { mapState } from 'vuex';
import { LControl } from 'vue2-leaflet';

export default {
  name: 'SteerButton',
  components: {
    'l-control': LControl,
  },
  computed: {
    ...mapState({
      visualSteeringEnabled: state => state.boat.steering.visualSteering.enabled,
      showPolar: state => state.boat.steering.visualSteering.showPolar,
      boatPosition: state => state.boat.position,
    }),
  },
  methods: {
    onClick () {
      if (this.boatPosition) {
        // FIXME: add config to always enable polar
        let showPolar = false;
        if (this.visualSteeringEnabled) {
          if (this.showPolar) {
             this.$store.commit('boat/steering/visualSteeringOff');
             return;
          }
          showPolar = true;
        }
        this.$store.commit('boat/steering/visualSteering', showPolar);
      }
    },
  },
}
</script>
