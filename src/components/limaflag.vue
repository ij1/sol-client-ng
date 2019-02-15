<template>
  <div class = "lima-flag" :style="{width: size + 'px', height: size + 'px'}">
    <div class = "lima-top">
      <div class = "lima-black"/>
      <div class = "lima-yellow lima-right"/>
    </div>
    <div class = "lima-bottom">
      <div class = "lima-yellow"/>
      <div class = "lima-black lima-right"/>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LimaFlag',
  props: {
    size: {
      type: Number,
      required: true,
    }
  },
}
</script>

<style>
.lima-flag {
  position: relative;
}

.lima-yellow {
  background-color: yellow;
  width: 50%;
  height: 100%
}
.lima-black {
  background-color: black;
  width: 50%;
  height: 100%;
}
.lima-top {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 50%;
}
.lima-bottom {
  position: absolute;
  top: 50%;
  height: 50%;
  width: 100%;
}
.lima-right {
  position: absolute;
  top: 0px;
  left: 50%;
}
</style>
