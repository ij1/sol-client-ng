<template>
  <div>
    <button
      :disabled = "!allowIsochrones"
      @click.prevent = "isochrone('cog')"
      @keydown.enter.prevent = "isochrone('cog')"
    >
      COG isochrones
    </button>
    <button
      :disabled = "!allowIsochrones"
      @click.prevent = "isochrone('twa')"
      @keydown.enter.prevent = "isochrone('twa')"
    >
      TWA isochrones
    </button>
    <button
      @click.prevent = "clearIsochrones"
      @keydown.enter.prevent = "clearIsochrones"
    >
      Clear isochrones
    </button>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'IsochronesTool',
  computed: {
    allowIsochrones () {
      return this.wxValid && this.raceLoaded &&
             this.isochroneCalculating === null;
    },
    ...mapState({
      showTools: state => state.ui.showTools,
      raceLoaded: state => state.race.loaded,
      isochroneCalculating: state => state.ui.tools.isochroneCalculating,
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
  },
}
</script>
