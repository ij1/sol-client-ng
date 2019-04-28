<template>
  <div>
    <label>{{cfg.cfgText}}</label>
    <input
      v-if = "cfg.type === 'boolean'"
      type = "checkbox"
      :checked = "value"
      @input = "$emit('update:value', $event.target.checked)"
    />
  </div>
</template>

<script>
export default {
  name: 'ConfigBoolean',
  props: {
    cfg: {
      type: Object,
      required: true,
    },
    value: {
      type: Boolean,
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
