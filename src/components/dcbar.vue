<template>
  <l-control :position = "'topright'">
    <div id = "dc-bar" v-if = "nextDC !== null">
      Next DC:
      {{ nextDC.type | cctocog }}={{ nextDC | prettyDegrees }}
      in {{ nextDCDelay | formatNextDCTime }}
    </div>
  </l-control>
</template>

<script>
import { mapGetters } from 'vuex';
import { LControl } from 'vue2-leaflet';
import { radToDeg, daysToMsec, hToMsec, minToMsec, msecToDays, msecToH, msecToMin } from '../lib/utils.js';
import { roundToFixed } from '../lib/quirks.js';
import { dcTwaTextPrefix } from '../lib/nav.js';

export default {
  name: 'DcBar',
  components: {
    'l-control': LControl,
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
    ...mapGetters({
      nextDC: 'boat/steering/nextDC',
      nextDCDelay: 'boat/steering/nextDCDelay',
    }),
  },
  watch: {
    nextDCDelay (value) {
      if (value <= 0) {
        this.$store.commit('boat/steering/clearDC');
      }
    },
  },
}
</script>

<style scoped>
#dc-bar {
  pointer-events: none;
  text-align: right;
  font-weight: bold;
  cursor: crosshair;
}
.time-of-day-white #dc-bar {
  color: #000;
  background: rgba(180, 180, 180, 0.5);
}
.time-of-day-dark #dc-bar {
  color: #0f0;
  background: rgba(60, 60, 60, 0.8);
}
</style>
