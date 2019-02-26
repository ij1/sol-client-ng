<template>
  <div
    class = "popup-window"
    :style = "{
      'z-index': this.zIndex
    }"
  >
    <div class = "popup-titlebar">
      <span>{{title}}</span>
    </div>
    <form @submit.prevent="$emit('submit')">
      <div>
        <slot></slot>
      </div>
      <div style="margin-top: 10px">
        <button
          type = "close"
          @click.prevent = "$emit('close')"
          @keydown.enter.prevent = "$emit('close')"
        >
          {{closeButtonLabel}}
        </button>
        <slot name = "extrabuttons"></slot>
        <button
          v-if = "submitButtonLabel !== null"
          type = "submit"
          :disabled = "!canSubmit"
        >
          {{submitButtonLabel}}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
export default {
  name: 'PopupWindow',
  props: {
    title: {
      type: String,
      default: '',
    },
    zIndex: {
      type: Number,
      required: true,
    },
    closeButtonLabel: {
      type: String,
      default: 'Close',
    },
    submitButtonLabel: {
      type: String,
      default: null,
    },
    canSubmit: {
      type: Boolean,
      default: true,
    },
  },
}
</script>

<style scoped>
.popup-window {
  position: absolute;
  left: 50%;
  top: 50%;
  margin-right: -50%;
  max-height: 80%;
  max-width: 80%;
  transform: translate(-50%, -50%);
  border: solid 3px;
  border-radius: 10px;
  border-color: #808080;
  background: #fff;
  text-align: left;
}
.popup-titlebar {
  background-color: #808080;
  margin: 0px;
}
.popup-titlebar span {
  margin: 10px;
}
.popup-window form {
  padding: 10px;
}
</style>
