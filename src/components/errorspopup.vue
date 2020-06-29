<template>
  <popup-window
    title = ""
    :z-index = "1000"
    close-button-label = "OK"
    @close = "doOk"
    v-if="apiErrors !== null"
  >
    <div class = "error-list">
      <div
        v-for = "(error, idx) in apiErrors"
        :key = "idx"
      >
        <div>{{error}}</div>
        <div class = "error-stack">{{error.stack}}</div>
      </div>
    </div>
  </popup-window>
</template>

<script>
import { mapState } from 'vuex';
import PopupWindow from './popupwindow.vue';

export default {
  name: 'ErrorsPopup',
  components: {
    'popup-window': PopupWindow,
  },
  computed: {
    apiErrors () {
      if (this.showApiErrors === null) {
        return null;
      }
      return this.$store.state.solapi.apiCallStats[this.showApiErrors].errorLog;
    },
    ...mapState({
      showApiErrors: state => state.diagnostics.showApiErrors,
    }),
  },

  methods: {
    doOk: function() {
      this.$store.commit('diagnostics/popupApiErrors', null);
    }
  }
}
</script>

<style scoped>
.error-list {
  font-size: 10px;
}
.error-stack {
  font-size: 9px;
  padding-left: 10px;
  white-space: pre;
}
</style>
