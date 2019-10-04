<template>
  <audio
    id = "weather-sound"
    :src = "publicPath + 'sounds/wind.mp3'"
    type = "audio/mpeg"
  />
</template>

<script>
import { mapState } from 'vuex';
import { publicPath } from '../lib/sol.js';

export default {
  name: 'WeatherSound',
  data () {
    return {
      publicPath: publicPath,
    }
  },
  computed: {
    ...mapState({
      cfgNewWxSound: state => state.weather.cfg.sound.value,
      wxUpdated: state => state.weather.data.updated,
    }),
  },
  watch: {
    wxUpdated (newVal, oldVal) {
      if (!this.cfgNewWxSound || (oldVal === null)) {
        return;
      }
      if (newVal > oldVal) {
        this.$el.pause();
        this.$el.currentTime = 0;
        this.$el.play();
      }
    }
  },
}
</script>

<style scoped>
#weather-sound {
  position: absolute;
  top: 110%;
}
</style>
