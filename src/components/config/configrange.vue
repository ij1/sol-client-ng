<template>
  <div>
    <label>{{cfg.cfgText}}</label>
    <input
      type = "range"
      :min = "cfg.low"
      :max = "cfg.high"
      :value = "value"
      @input = "$emit('update:value', Number($event.target.value))"
    />
  </div>
</template>

<script>
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
}
</script>

<style scoped>
input[checkbox] {
  font-size: 10px;
}
</style>
