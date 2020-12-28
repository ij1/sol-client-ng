<template>
  <div
    class = "boat-instrument"
    v-if = "enabled"
    :style = '{"background-color": bgColor}'
  >
    <div class="boat-instrument-label">
      {{ instrument.name }} [{{ instrument.unit }}]
    </div>
    <div class="boat-instrument-value" :style = '{color: color}'>
      {{ instrument | format($store.state, $store.getters) }}
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'BoatInstrument',
  props: {
    id: {
      type: String,
      required: true
    },
  },
  computed: {
    instrument () {
      return this.$store.state.boat.instruments[this.id];
    },
    enabled () {
      return (typeof this.instrument.enabled === 'undefined') ||
             this.instrument.enabled.value;
    },
    color () {
      if (typeof this.instrument.color !== 'undefined') {
        const col = this.instrument.color(this.instrument, this.$store.state);
        if (col !== null) {
          return col;
        }
      }
      return !this.isDark ? '#000000' : '#ffffff';
    },
    bgColor () {
      if (typeof this.instrument.bgColor !== 'undefined') {
        return this.instrument.bgColor(this.instrument, this.$store.state);
      }
      return null;
    },
    ...mapGetters({
      isDark: 'ui/isDark',
    }),
  },
  filters: {
    format (instrument, state, getters) {
      let val;
      if (typeof instrument.calculate === 'undefined') {
        val = instrument.value;
      } else {
        val = instrument.calculate(state.boat.instruments, getters);
      }
      if (val === null) {
        return '--.--';
      }
      if (typeof instrument.format !== 'undefined') {
        return instrument.format(val, instrument, state);
      }
      return val;
    }
  }
}
</script>

<style scoped>
.boat-instrument {
  min-width: 55px;
  padding: 3px;
  border: 1px solid rgba(220, 220, 220, 0.7);
  border-right: none;
  border-bottom: 0px;
  background-image: linear-gradient(rgba(200, 200, 200, 0.8), rgba(56, 56, 56, 0.8));
  background-clip: padding-box;
}

.boat-instrument:last-child {
  border-right: 1px solid rgba(220, 220, 220, 0.7);
}

.boat-instrument-label {
  font-size: 9px;
  text-align: left;
  user-select: none;
}

.boat-instrument-value {
  font-size: 14px;
  font-weight: bold;
  text-align: right;
}
</style>
