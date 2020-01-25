<template>
  <div class = "scrollable-table-container">
    <div class = "scrollable-table-header">
      <table cellspacing = "0" cellpadding = "1px">
        <thead class = "visualhead" ref = "visualhead">
          <slot name = "headers"></slot>
        </thead>
      </table>
    </div>
    <div class = "scrollable-table-wrapper">
      <table cellspacing = "0" cellpadding = "1px" class = "scrollable-table">
        <thead class = "fakehead" ref = "fakehead">
          <tr><slot name = "headers"></slot></tr>
          <tr><slot name = "dummydata"></slot></tr>
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
      let srcArr = this.$refs.fakehead.children[0].children;

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
  activated () {
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
.scrollable-table-header {
  flex: none;
  overflow: hidden;
  height: 17px;
}
.scrollable-table-wrapper {
  flex: 1 1;
  flex-basis: calc(100% - 17px);
  overflow-y: scroll;
  position: relative;
}
.scrollable-table {
  position: absolute;
  top: 0;
  left: 0;
  white-space: nowrap;
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
