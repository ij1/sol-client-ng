export let uiModeMixin = {
  methods: {
    uiModeOnKey (e) {
      if (e.which === 27) {
        this.$store.dispatch('ui/cancelUiMode');
        return;
      }
    }
  },
  mounted () {
    window.addEventListener('keyup', this.uiModeOnKey);
  },
  beforeDestroy () {
    window.removeEventListener('keyup', this.uiModeOnKey);
  },
}
