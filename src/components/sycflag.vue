<template>
  <div class="syc-container" v-if="syc">
    <img src="images/sycflag.png" class="syc-flag"/>
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
  width: 16px;
  height: 13px;
  margin-left: 1px;
}
.syc-flag {
  position: relative;
  top: 1px;
  left: 1px;
}
</style>
