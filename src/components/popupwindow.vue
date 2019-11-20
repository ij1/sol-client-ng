<template>
  <div
    class = "popup-window"
    :style = "{
      'z-index': zIndex
    }"
  >
    <div class = "popup-titlebar">
      <span>{{title}}</span>
      <span
        v-if = "closeButtonLabel !== null"
        @click.prevent = "$emit('close')"
      >X</span>
    </div>
    <form @submit.prevent="$emit('submit')" >
      <div class = "popup-content">
        <slot></slot>
      </div>
      <div class = "popup-buttons">
        <button
          v-if = "closeButtonLabel !== null"
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
          @keydown.enter.prevent = "$emit('submit')"
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
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.popup-titlebar span {
  margin: 10px;
}
.popup-window form {
  min-height: 50px;
  max-height: 80vh;
  max-width: 70vw;
  display: flex;
  flex-direction: column;
  padding: 10px;
}
.popup-content {
  min-height: 0px;
  flex: auto;
  overflow-y: auto;
}
.popup-buttons {
 margin-top: 10px;
 flex: none;
}
</style>
