<template>
  <audio
    id = "ground-alert-sound"
    :src = "publicPath + 'sounds/groundalert.mp3'"
    type = "audio/mpeg"
  />
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { publicPath } from '../lib/sol.js';

export default {
  name: 'GroundAlertSound',
  data () {
    return {
      publicPath: publicPath,
    }
  },
  computed: {
    groundAlert () {
      if (!this.boatLoaded || this.publicBoat || !this.cfgGroundAlertSound) {
        return false;
      }
      if (!this.isRaceStarted || (this.boatFinishTime !== null)) {
        return false;
      }
      /* API returns sometimes non-zero TWA (very very small) for TWA=0 */
      if (this.boatTwa > 0.000001) {
        return false;
      }
      if (this.boatPosition.equals(this.raceStartPosition)) {
        return false;
      }
      return true;
    },
    ...mapState({
      cfgGroundAlertSound: state => state.ui.cfg.groundAlertSound.value,
      boatLoaded: state => state.boat.id,
      boatPosition: state => state.boat.position,
      boatFinishTime: state => state.boat.finishTime,
      boatTwa: state => state.boat.instruments.twa.value,
    }),
    ...mapGetters({
      isRaceStarted: 'race/isRaceStarted',
      raceStartPosition: 'race/startPosition',
      publicBoat: 'boat/publicBoat',
    }),
  },
  methods: {
    stopSound () {
      this.$el.pause();
      this.$el.loop = false;
    },
  },
  mounted () {
    this.stopSound();
  },
  watch: {
    cfgGroundAlertSound (newVal) {
      if (!newVal) {
        this.stopSound();
      }
    },
    groundAlert (newVal, oldVal) {
      this.$el.pause();
      if (!this.cfgGroundAlertSound || (oldVal === null)) {
        this.$el.loop = false;
        return;
      }
      if (newVal && !oldVal) {
        this.$el.currentTime = 0;
        this.$el.loop = true;
        this.$el.play();
      } else {
        this.$el.loop = false;
      }
    }
  },
}
</script>

<style scoped>
#ground-alert-sound {
  position: absolute;
  top: 110%;
}
</style>
