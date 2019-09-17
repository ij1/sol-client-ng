<template>
  <div
    class = "boat-instrument"
    v-if = "enabled"
  >
    <div class="boat-instrument-label">
      {{ instrument.name }} [{{ instrument.unit }}]
    </div>
    <div class="boat-instrument-value" :style = '{color: color}'>
      {{ instrument | format($store.state) }}
    </div>
  </div>
</template>

<script>
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
      return '#000000';
    }
  },
  filters: {
    format (instrument, state) {
      if (instrument.value === null) {
        return '--.--';
      }
      if (typeof instrument.format !== 'undefined') {
        return instrument.format(instrument, state);
      }
      return instrument.value;
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
