<template>
  <div class="syc-container" v-if="syc">
    <span class="syc-flag">&#9658;</span>
  </div>
</template>

<script>
export default {
  name: 'SycFlag',
  props: {
    syc: {
      type: Boolean,
    },
  },
}
</script>

<style>
.syc-container {
  position: relative;
  display: inline-block;
  width: 11px;
  height: 11px;
  margin-left: 1px;
  overflow: hidden;
}
.syc-flag {
  position: relative;
  top: -2px;
  left: 0px;
  font-size: 10px;
  width: 11px;
}
</style>
