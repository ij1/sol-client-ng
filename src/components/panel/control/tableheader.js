/*
 * Copies width from $refs fakehead -> visualhead
 */
export default {
  methods: {
    setTableHeaderWidth () {
      let dstArr = this.$refs.visualhead.children;
      let srcArr = this.$refs.fakehead.children;

      for (let i = 0; i < dstArr.length; i++) {
        dstArr[i].style.width = srcArr[i].offsetWidth + 'px';
      }
    },
  },
  beforeUpdate () {
    this.setTableHeaderWidth();
  },
  mounted () {
    this.setTableHeaderWidth();
  },
}
