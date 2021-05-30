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
        :style = "{top: pickerTop + 'px'}"
        :head = "cfg.cfgText"
        :value = "value"
        @input = "doInput"
        @ok = "pickerOpen = false"
        @cancel = "doCancel"
        ref = "color-picker"
        @hook:mounted="pickerMounted"
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
    scrollStamp: {
      type: Number,
      required: true,
    },
  },
  data () {
    return {
      pickerOpen: false,
      pickerTop: 0,
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
      this.setPosition();
      this.pickerOpen = true;
    },
    setPosition () {
      const r = this.$el.getBoundingClientRect();
      const p = this.$el.offsetParent.getBoundingClientRect();
      this.pickerTop = r.top - p.top + 3;
    },
    pickerMounted () {
      const p = this.$el.offsetParent.getBoundingClientRect();
      const ch = this.$refs['color-picker'].$el.clientHeight;
      if (this.pickerTop + ch > p.height - 16) {
        this.pickerTop = p.height - 16 - ch;
      }
    },
    doCancel () {
      this.pickerOpen = false;
      this.$emit('update:value', this.oldValue);
    },
  },
  watch: {
    scrollStamp () {
      if (this.pickerOpen) {
        this.doCancel();
      }
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
