<template>
  <l-control
    :position = "'bottomright'"
  >
    <div id = "quick-access-container">
      <transition-group name = "fade" tag = "div">
        <div
          class = "tool-button tool-subbutton"
          ref = "quick-access-tws"
          key = "qa-tws"
          v-if = "cfgQuickAccessButtons"
          :style = "{color: cfgTwsTxt ? 'red' : 'black'}"
          @click.stop.prevent = "onTwsClick"
          @touchstart.stop.prevent = "onTwsClick"
          @touchend.stop.prevent
        >
          TWS
        </div>
        <div
          class = "tool-button tool-subbutton"
          ref = "quick-access-twd"
          key = "qa-twd"
          v-if = "cfgQuickAccessButtons"
          :style = "{color: cfgTwdTxt ? 'red' : 'black'}"
          @click.stop.prevent = "onTwdClick"
          @touchstart.stop.prevent = "onTwdClick"
          @touchend.stop.prevent
        >
          TWD
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
  name: 'QuickAccessButtons',
  components: {
    'l-control': LControl,
  },
  computed: {
    ...mapState({
      cfgQuickAccessButtons: state => state.weather.cfg.quickAccessButtons.value,
      cfgTwsTxt: state => state.weather.cfg.twsTxt.value,
      cfgTwdTxt: state => state.weather.cfg.twdTxt.value,
    }),
  },
  methods: {
    onTwsClick () {
      this.$store.commit('weather/configSetValue', {
        path: ['cfg', 'twsTxt'],
        value: !this.cfgTwsTxt,
      });
    },
    onTwdClick () {
      this.$store.commit('weather/configSetValue', {
        path: ['cfg', 'twdTxt'],
        value: !this.cfgTwdTxt,
      });
    },
  },
  updated () {
   if (typeof this.$refs['quick-access-tws'] !== 'undefined') {
     L.DomEvent.disableClickPropagation(this.$refs['quick-access-tws']);
     L.DomEvent.disableClickPropagation(this.$refs['quick-access-twd']);
   }
 },
}
</script>

<style scoped>
#quick-access-container {
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
