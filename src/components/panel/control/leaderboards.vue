<template>
  <div id="leaderboards">
    <control-leaderboard/>
  </div>
</template>

<script>
import ControlLeaderboard from './leaderboard.vue';

export default {
  name: 'Leaderboards',
  components: {
    'control-leaderboard': ControlLeaderboard,
  },
}
</script>

<style scoped>
#leaderboards {
  height: 100%;
  width: 100%;
}
</style>
