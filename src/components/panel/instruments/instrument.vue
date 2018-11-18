<template>
  <div class="boat-instrument">
    <div class="boat-instrument-label">
      {{ instrument.name }} [{{ instrument.unit }}]
    </div>
    <div class="boat-instrument-value">
      {{ instrument | format() }}
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
    }
  },
  filters: {
    format (instrument) {
      if (instrument.value === null) {
        return '--.--';
      }
      if (typeof instrument.format !== 'undefined') {
        return instrument.format(instrument);
      }
      return instrument.value;
    }
  }
}
</script>

<style scoped>
.boat-instrument {
  float: left;
  width: 60px;
  padding: 3px;
  border: 1px solid #f0f0f0;
  border-right: none;
}

.boat-instrument:last-child {
  border-right: 1px solid #f0f0f0;
}

.boat-instrument-label {
  font-size: 8px;
  text-align: left;
}

.boat-instrument-value {
  font-size: 12px;
  font-weight: bold;
  text-align: right;
  color: #00ff00;
}
</style>