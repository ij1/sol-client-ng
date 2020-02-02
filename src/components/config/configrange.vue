<template>
  <div class = "config-range">
    <label>{{cfg.cfgText}}</label>
    <span class = "config-range-container">
      <input
        type = "range"
        :min = "cfg.low"
        :max = "cfg.high"
        :value = "value"
        :class = "{ 'reverse-range': isReverse } "
        @input = "$emit('update:value', Number($event.target.value))"
      />
      <span class = "range-tic range-low-tic">{{lowText}}</span>
      <span class = "range-tic range-high-tic">{{highText}}</span>
    </span>
  </div>
</template>

<script>
export function configParseRange (txtVal, cfgDef) {
  const regex = /^[-+]?\d\d*(\.\d\d*)?$/;
  if (!regex.test(txtVal)) {
    return null;
  }
  const val = parseFloat(txtVal);
  if (!Number.isFinite(val)) {
    return null;
  }
  if (val < cfgDef.low || val > cfgDef.high) {
    return null;
  }
  return val;
}

export default {
  name: 'ConfigRange',
  props: {
    cfg: {
      type: Object,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
  },
  computed: {
    isReverse () {
      return (typeof this.cfg.reverse !== 'undefined') && this.cfg.reverse;
    },
    lowText () {
      return (typeof this.cfg.lowText !== 'undefined') ?
        this.cfg.lowText : this.cfg.low;
    },
    highText () {
      return (typeof this.cfg.highText !== 'undefined') ?
        this.cfg.highText : this.cfg.high;
    },
  },
}
</script>

<style scoped>
.config-range {
  height: 23px;
  vertical-align: center;
  display: flex;
  flex-direction: row;
}
.config-range-container {
  position: relative;
  margin-left: 5px;
}
.config-range-container input {
  position: relative;
  top: 4px;
}
.range-tic {
  position: absolute;
  font-size: 9px;
  z-index: 1;
}
.range-low-tic {
  left: 1px;
}
.range-high-tic {
  right: 1px;
}
.reverse-range {
  direction: rtl;
}
</style>
