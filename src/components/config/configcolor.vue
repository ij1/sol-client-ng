<template>
  <div>
    <label>{{cfg.cfgText}}</label>
    <span
      class = "config-color"
      :style = "{'background-color': value}"
      @click.self = "doOpen"
    >
      <photoshop-picker
        v-if = "pickerOpen"
        id = "color-picker"
        :head = "cfg.cfgText"
        :value = "value"
        @input = "doInput"
        @ok = "pickerOpen = false"
        @cancel = "doCancel"
      />
    </span>
  </div>
</template>

<script>
import { Photoshop } from 'vue-color';

export function configParseColor (txtVal) {
  const regex = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
  if (!regex.test(txtVal)) {
    return null;
  }
  return txtVal;
}

export default {
  name: 'ConfigColor',
  components: {
    'photoshop-picker': Photoshop,
  },
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
  data () {
    return {
      pickerOpen: false,
      oldValue: null,
    }
  },
  methods: {
    doInput (val) {
      this.$emit('update:value', val.hex);
    },
    doOpen () {
      if (!this.pickerOpen) {
        this.oldValue = this.value;
      }
      this.pickerOpen = true;
    },
    doCancel () {
      this.pickerOpen = false;
      this.$emit('update:value', this.oldValue);
    },
  },
}
</script>

<style scoped>
#color-picker {
  position: absolute;
  z-index: 2;
}
.config-color {
  display: inline-block;
  width: 50px;
  height: 15px;
  margin-left: 7px;
  border: solid 1px black;
}
</style>
