<template>
  <div>
    <label>{{cfg.cfgText}}</label>
    <select
      :value = "value"
      @change = "$emit('update:value', $event.target.value)"
    >
      <option
        v-for = "v in cfg.values"
        :value = "v"
        :key = "v"
      >
        {{v}}
      </option>
    </select>
  </div>
</template>

<script>
export default {
  name: 'ConfigValues',
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
