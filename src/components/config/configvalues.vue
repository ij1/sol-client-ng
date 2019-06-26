<template>
  <div>
    <label>{{cfg.cfgText}}</label>
    <select
      :value = "value"
      @change = "$emit('update:value', $event.target.value)"
    >
      <option
        v-for = "v in cfg.values"
        :value = "!Array.isArray(v) ? v : v[0]"
        :key = "!Array.isArray(v) ? v : v[0]"
      >
        {{v | format}}
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
      type: String,
      required: true,
    },
  },
  filters: {
    format (value) {
      return !Array.isArray(value) ? value : value[1];
    },
  },
}
</script>
