<template>
  <div>
    <label>{{cfg.cfgText}}</label>
    <input
      type = "range"
      :min = "cfg.low"
      :max = "cfg.high"
      :value = "value"
      :class = "{ 'reverse-range': isReverse } "
      @input = "$emit('update:value', Number($event.target.value))"
    />
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
    }
  },
}
</script>

<style scoped>
.reverse-range {
  direction: rtl;
}
</style>
