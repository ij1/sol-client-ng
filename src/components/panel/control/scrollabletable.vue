<template>
  <div class = "scrollable-table-container">
    <div class = "scrollable-table-header">
      <table cellspacing = "0" cellpadding = "1px">
        <thead class = "visualhead" ref = "visualhead">
          <slot name = "headers"></slot>
        </thead>
      </table>
    </div>
    <div class = "scrollable-table">
      <table cellspacing = "0" cellpadding = "1px">
        <thead class = "fakehead" ref = "fakehead">
          <slot name = "headers"></slot>
        </thead>
        <tbody class = "scrollable-table-content">
          <slot></slot>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ScrollableTable',
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
</script>

<style>
.scrollable-table-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.scrollabel-table-header {
  flex: none;
  overflow: hidden;
}
.scrollable-table {
  flex: auto;
  white-space: nowrap;
  overflow-y: scroll;
}
.visualhead, .visualhead th {
  padding: 0px;
}
.fakehead, .fakehead th {
  padding: 0px;
  line-height: 0px;
  overflow: hidden;
}
</style>
