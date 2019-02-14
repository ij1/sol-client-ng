<template>
  <div id="polar-container">
    <div id="boat-type">
      <span v-html="this.boatType"/>
    </div>
    <polar-graph v-if = "this.polarLoaded"/>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import PolarGraph from './polar.vue';

export default {
  name: 'ControlPolarContainer',
  components: {
    'polar-graph': PolarGraph,
  },
  computed: {
    ...mapState({
      polarLoaded: state => state.boat.polar.loaded,
      boatType: state => state.boat.type,
    }),
  }
}
</script>

<style scoped>
#polar-container {
  padding-top: 10px;
  text-align: left;
}
#boat-type {
  padding-left: 20px;
  font-size: 14px;
  font-weight: bold;
}
</style>
