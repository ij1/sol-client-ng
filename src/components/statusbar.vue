<template>
  <div id="status-bar">
    <div id="status-bar-left">
      <div v-if="this.$store.state.race.loaded">
        <span v-html="this.$store.state.race.info['message']"/>
        {{ this.boatInfo }}
      </div>
    </div>
    <div id="status-bar-right">
      <div v-if="this.nextDC !== null">
        Next DC:
        {{ this.nextDC.type | cctocog }}={{ this.nextDC.value | prettyDegrees }}
        in {{ this.toNextDCTime | formatNextDCTime }}
      </div>
    </div>
  </div>
</template>

<script>
import { radToDeg, daysToMsec, hToMsec, minToMsec, msecToDays, msecToH, msecToMin } from '../lib/utils.js';

export default {
  name: 'StatusBar',
  data () {
    return {
      dcTimer: null,
      toNextDCTime: null,
    }
  },
  filters: {
    prettyDegrees (radians) {
      return radToDeg(radians).toFixed(3).replace(/\.*0*$/, '');
    },
    cctocog (type) {
      return type === 'cc' ? 'cog' : type;
    },
    formatNextDCTime (msecs) {
      const d = Math.floor(msecToDays(msecs));
      msecs -= daysToMsec(d);
      const h = Math.floor(msecToH(msecs));
      msecs -= hToMsec(h);
      const m = Math.floor(msecToMin(msecs));
      msecs -= minToMsec(m);
      const secs = Math.floor(msecs / 1000);

      return (d > 0 ? d + 'd ' : '') +
             ((d > 0 || h > 0) ? h + 'h ' : '') +
             ((d > 0 || h > 0 || m > 0) ? m + 'm ' : '') +
             secs + 's';
    }
  },
  computed: {
    boatInfo () {
      if (this.$store.state.boat.id === null) {
        return '';
      }
      let txt = 'Boat ' + this.$store.state.boat.name;
      if (this.$store.state.boat.finish_time !== null) {
        return txt + ' has finished the race.';
      }
      return txt + ' ranked #' + this.$store.state.boat.ranking +
             ' with ' + this.$store.state.boat.dtg.toFixed(1) + 'nm to go.'
    },
    nextDC () {
      if (this.$store.state.boat.steering.dcs.list.length === 0) {
        return null;
      }
      return this.$store.state.boat.steering.dcs.list[0];
    },
  },
  methods: {
    updateDCTimer () {
      const now = this.$store.getters['time/now']();
      const toNextDC = this.nextDC.time - now;
      if (toNextDC <= 0) {
        this.dcTimer = null;
        this.$store.commit('boat/steering/clearDC');
        return;
      }
      this.toNextDCTime = toNextDC;

      let time = toNextDC;
      time = time % 1000 + 2;
      this.dcTimer = setTimeout(this.updateDCTimer.bind(this), time);
    }
  },
  watch: {
    nextDC () {
      if (this.dcTimer !== null) {
        clearTimeout(this.dcTimer);
        this.dcTimer = null;
      }
      if (this.nextDC !== null) {
        this.updateDCTimer();
      }
    },
  },
  mounted () {
    if (this.nextDC !== null) {
      this.updateDCTimer();
    }
  },
  beforeDestroy () {
    if (this.dcTimer !== null) {
      clearTimeout(this.dcTimer);
      this.dcTimer = null;
    }
  }
}
</script>

<style scoped>
#status-bar {
  position: absolute;
  width: 100%;
  z-index: 1;
  font-size: 12px;
}

#status-bar-left {
  position: absolute;
  left: 0;
}
#status-bar-right {
  position: absolute;
  right: 0;
}
</style>
