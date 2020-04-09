<template>
  <vue-resizable
    class = "popup-window"
    :style = "{
      'z-index': zIndex
    }"
    :active = "resizeHandlers"
    :dragSelector = "dragSelector"
    top = "50%"
    left = "50%"
    height = ""
    width = ""
  >
    <div class = "popup-titlebar">
      <span>{{title}}</span>
      <span
        v-if = "closeButtonLabel !== null"
        @click.prevent = "$emit('close')"
      >X</span>
    </div>
    <form
      @keydown.enter.prevent = "doFormEnter"
      @submit.prevent = "$emit('submit')"
      :autocomplete = "autoComplete ? 'on' : 'off'"
    >
      <div
        class = "popup-content"
        :style = "{'overflow-y' : contentOverflow}"
      >
        <slot></slot>
      </div>
      <div class = "popup-buttons">
        <button
          v-if = "closeButtonLabel !== null"
          type = "close"
          @keydown.enter.prevent = "$emit('close')"
          @click.prevent = "$emit('close')"
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
  </vue-resizable>
</template>

<script>
import VueResizable from 'vue-resizable';

export default {
  name: 'PopupWindow',
  components: {
    'vue-resizable': VueResizable,
  },
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
    contentOverflow: {
      type: String,
      default: 'auto',
    },
    autoComplete: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      resizeHandlers: [],
      dragSelector: '.popup-titlebar',
    }
  },
  methods: {
    doFormEnter () {
      if (this.submitButtonLabel !== null) {
        if (this.canSubmit) {
          this.$emit('submit');
        }
      } else {
        this.$emit('close');
      }
    },
  },
}
</script>

<style scoped>
.popup-window {
  position: absolute;
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
  overflow: hidden;
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
}
.popup-buttons {
 margin-top: 10px;
 flex: none;
}
</style>
