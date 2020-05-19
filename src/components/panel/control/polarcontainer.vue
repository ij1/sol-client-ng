<template>
  <div id="polar-container">
    <div id = "polar-header">
      <span id = "boat-type" v-html="boatType"/>
      <span id = "polar-mode-container">
        <label for = "polar-mode">Curves:</label>
        <select
          id = "polar-mode"
          v-model = "polarMode"
        >
          <option
            v-for = "mode in Object.keys(polarModes)"
            :value = "mode"
            :key = "mode"
          >
            {{polarModes[mode].label}}
          </option>
        </select>
      </span>
    </div>
    <div id = "polar-max-area" ref = "polar-max-area">
      <polar-graph v-if = "polarLoaded" :polar-size-limit = "polarSizeLimit"/>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { EventBus } from '../../../lib/event-bus.js';
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
    polarMode: {
      get () {
        return this.$store.state.boat.polar.polarMode;
      },
      set (value) {
        this.$store.commit('boat/polar/setPolarMode', value);
      },
    },
    ...mapState({
      polarLoaded: state => state.boat.polar.loaded,
      polarModes: state => state.boat.polar.polarModes,
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
      EventBus.$on('right-pane-resize', this.recalculateDimensions);
      this.recalculateDimensions();
    });
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize);
    EventBus.$off('right-pane-resize', this.recalculateDimensions);
  },
}
</script>

<style scoped>
#polar-container {
  padding-top: 10px;
  text-align: left;
  display: flex;
  min-height: 30px;
  flex-direction: column;
}
#polar-header {
  padding-left: 20px;
  flex: none;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
#boat-type {
  font-size: 14px;
  font-weight: bold;
}
#polar-mode-container {
  font-size: 11px;
}
#polar-mode-container select {
  font-size: 11px;
}
#polar-max-area {
  flex: auto;
  min-height: 1px;
  width: 100%;
}
</style>
