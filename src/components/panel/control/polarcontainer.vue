<template>
  <div id="polar-container">
    <div id="boat-type">
      <span v-html="boatType"/>
    </div>
    <div id = "polar-max-area" ref = "polar-max-area">
      <polar-graph v-if = "polarLoaded" :polar-size-limit = "polarSizeLimit"/>
    </div>
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
  data () {
    return {
      polarSizeLimit: {
        maxWidth: 40,
        maxHeight: 50
      },
    }
  },
  computed: {
    ...mapState({
      polarLoaded: state => state.boat.polar.loaded,
      boatType: state => state.boat.type,
    }),
  },
  methods: {
    recalculateDimensions () {
      this.polarSizeLimit = {
        maxWidth: this.$refs['polar-max-area'].clientWidth,
        maxHeight: this.$refs['polar-max-area'].clientHeight,
      };
    },
    onResize () {
      this.$nextTick(() => {
        this.recalculateDimensions();
      });
    },
  },
  mounted () {
    this.$nextTick(() => {
      window.addEventListener('resize', this.onResize);
      this.recalculateDimensions();
    });
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize);
  },
}
</script>

<style scoped>
#polar-container {
  padding-top: 10px;
  text-align: left;
  display: flex;
  flex-direction: column;
}
#boat-type {
  padding-left: 20px;
  font-size: 14px;
  font-weight: bold;
  flex: none;
}
#polar-max-area {
  flex: auto;
}
</style>
