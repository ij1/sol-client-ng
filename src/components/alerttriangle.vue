<template>
   <div
     class = "alert-container"
   >
     <div class = "alert-tri-container">
       <div class = "alert-tri"/>
     </div>
     <div class = "alert-ex">!</div>
   </div>
</template>

<script>
export default {
  name: 'AlertTriangle',
}
</script>

<style>
.alert-container {
  position: absolute;
  z-index: 0;
  mix-blend-mode: multiply;
}
.alert-ex {
  position: relative;
  z-index: 1;
  top: 0px;
  left: 1px;
  width: 100%;
  height: 100%;
  text-align: center;
  font-weight: bold;
}
.alert-tri-container {
  position: absolute;
  left: 40%;
  top: 40%;
  width: 52%;
  height: 52%;
  z-index: -1;
}
.alert-tri {
  position: absolute;
  background-color: orange;
  text-align: left;
}
.alert-tri::before, .alert-tri::after {
  position: absolute;
  background-color: inherit;
  content: '';
}
.alert-tri, .alert-tri::before, .alert-tri::after {
  width: 100%;
  height: 100%;
  border-top-right-radius: 30%;
}

.alert-tri {
  transform: rotate(60deg) skewX(-30deg) scale(1, 0.866);
}
.alert-tri::before {
  transform: rotate(-135deg) skewX(-45deg) scale(1.414, 0.707) translate(0, -50%);
}
.alert-tri::after {
  transform: rotate(135deg) skewY(-45deg) scale(0.707, 1.414) translate(50%);
}
</style>
