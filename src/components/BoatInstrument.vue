<template>
  <div class="boat-instrument">
    <div class="boat-instrument-label">
      {{ name }} [{{ unit }}]
    </div>
    <div class="boat-instrument-value">
      {{ this.$store.state.boat.instruments[datafield] | format(mult, decimals) }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'BoatInstrument',
  props: {
    name: {
      type: String,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    datafield: {
      type: String,
      required: true,
    },
    mult: {
      type: Number,
      required: false
    },
    decimals: {
      type: Number,
      required: false
    }
  },
  filters: {
    format (value, multiplier, decimals) {
      if (value === undefined) {
        return '--.--';
      }
      let num = parseFloat(value);
      return Number.isFinite(num) ?
        (num * multiplier).toFixed(decimals) : value;
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
