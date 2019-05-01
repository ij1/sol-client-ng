<template>
  <l-control :position = "'topright'">
    <div id = "dc-bar" v-if = "this.nextDC !== null">
      Next DC:
      {{ this.nextDC.type | cctocog }}={{ this.nextDC | prettyDegrees }}
      in {{ this.toNextDCTime | formatNextDCTime }}
    </div>
  </l-control>
</template>

<script>
import { LControl } from 'vue2-leaflet';
import { radToDeg, daysToMsec, hToMsec, minToMsec, msecToDays, msecToH, msecToMin } from '../lib/utils.js';
import { roundToFixed } from '../lib/quirks.js';
import { dcTwaTextPrefix } from '../lib/nav.js';

export default {
  name: 'DcBar',
  components: {
    'l-control': LControl,
  },
  data () {
    return {
      dcTimer: null,
      toNextDCTime: null,
    }
  },
  filters: {
    prettyDegrees (dc) {
      return dcTwaTextPrefix(dc) +
             roundToFixed(radToDeg(dc.value), 3).replace(/\.*0*$/, '');
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
#dc-bar {
  pointer-events: none;
  text-align: right;
}
</style>
