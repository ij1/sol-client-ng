<template>
  <div>
    <div class = "tools-header">Isochrone calculator</div>
    <div class = "tools-content">
      <div>
        <label for = "isochrone-len">Length:</label>
        <select
          id = "isochrone-len"
          :value = "isochroneLen"
          @change = "onSelectLen($event.target.value)"
          @click.stop
        >
          <option
            v-for = "(len, idx) in isochroneLengths"
            :value = "len"
            :key = "idx"
          >
            {{ len }} h
          </option>
        </select>
        <label for = "isochrone-step">Step:</label>
        <select
          id = "isochrone-step"
          :value = "isochroneStep"
          @change = "onSelectStep($event.target.value)"
          @click.stop
        >
          <option
            v-for = "(step, idx) in isochroneSteps"
            :value = "step"
            :key = "idx"
          >
            {{ step }} h
          </option>
        </select>
      </div>
      <button
        :disabled = "!allowIsochrones"
        @click.prevent = "isochrone('cog')"
        @keydown.enter.prevent = "isochrone('cog')"
      >
        COG
      </button>
      <button
        :disabled = "!allowIsochrones"
        @click.prevent = "isochrone('twa')"
        @keydown.enter.prevent = "isochrone('twa')"
      >
        TWA
      </button>
      <button
        @click.prevent = "clearIsochrones"
        @keydown.enter.prevent = "clearIsochrones"
      >
        Clear
      </button>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'IsochronesTool',
  data () {
    return {
      isochroneLengths: [24, 48, 72, 96, 120, 168],
      isochroneSteps: [1, 2, 3, 4, 5, 6, 12, 24],
    }
  },
  computed: {
    allowIsochrones () {
      return this.wxValid && this.raceLoaded &&
             this.isochroneCalculating === null;
    },
    ...mapState({
      showTools: state => state.ui.showTools,
      raceLoaded: state => state.race.loaded,
      isochroneCalculating: state => state.ui.tools.isochroneCalculating,
      isochroneLen: state => state.ui.tools.isochroneTimeLen,
      isochroneStep: state => state.ui.tools.isochroneTimeStep,
    }),
    ...mapGetters({
      wxValid: 'weather/valid',
    }),
  },
  methods: {
    isochrone (type) {
      this.$store.commit('ui/tools/clearIsochrones', type);
      this.$store.dispatch('ui/tools/calculateIsochrone', type);
    },
    clearIsochrones () {
      this.$store.commit('ui/tools/clearIsochrones', 'cog');
      this.$store.commit('ui/tools/clearIsochrones', 'twa');
    },
    onSelectLen (len) {
      this.$store.commit('ui/tools/isochroneLen', len);
    },
    onSelectStep (step) {
      this.$store.commit('ui/tools/isochroneStep', step);
    },
  },
}
</script>
