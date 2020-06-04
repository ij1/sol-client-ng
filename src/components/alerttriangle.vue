<template>
   <div
     class = "alert-container"
   >
     <img src="../images/alert.png" alt="Alert">
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
</style>
