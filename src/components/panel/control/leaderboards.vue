<template>
  <div id="leaderboards">
    <control-leaderboard/>
    <portal to="boatlist-editor-dest">
      <boatlist-editor/>
    </portal>
  </div>
</template>

<script>
import ControlLeaderboard from './leaderboard.vue';
import BoatlistEditor from './boatlist-editor.vue';

export default {
  name: 'Leaderboards',
  components: {
    'control-leaderboard': ControlLeaderboard,
    'boatlist-editor': BoatlistEditor,
  },
}
</script>

<style scoped>
#leaderboards {
  height: 100%;
  width: 100%;
}
</style>
