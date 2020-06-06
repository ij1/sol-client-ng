<template>
  <div class = "scrollable-table-container">
    <div class = "scrollable-table-header">
      <table cellspacing = "0" cellpadding = "1px">
        <thead class = "visualhead" ref = "visualhead">
          <slot name = "headers"></slot>
        </thead>
      </table>
    </div>
    <div
      class = "scrollable-table-wrapper"
      ref = "scrollable-table-wrapper"
      @scroll = "setScroll"
    >
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
        const width = srcArr[i].scrollWidth + 'px';
        dstArr[i].style.maxWidth = width;
        dstArr[i].style.minWidth = width;
      }
    },
    setScroll () {
      const left = '-' + this.$refs['scrollable-table-wrapper'].scrollLeft + 'px';
      this.$refs.visualhead.style.left = left;
    },
    dataUpdated () {
      this.$nextTick(() => {
        this.setTableHeaderWidth();
        this.setScroll();
      });
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
  white-space: nowrap;
  overflow: hidden;
  height: 17px;
}
.scrollable-table-wrapper {
  flex: 1 1;
  flex-basis: calc(100% - 17px);
  overflow-y: scroll;
  overflow-x: auto;
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
  box-sizing: border-box;
  position: relative;
}
.fakehead, .fakehead th {
  padding: 0px;
  line-height: 0px;
  overflow: hidden;
}
</style>
