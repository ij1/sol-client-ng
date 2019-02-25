<template>
  <div id="leaderboards">
    <control-leaderboard
      v-for = "(leaderboard, index) in this.boatlists"
      :key = "leaderboard.boatlistKey"
      :boatlist-index = "index"
    />
    <portal to="boatlist-editor-dest">
      <boatlist-editor/>
    </portal>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ControlLeaderboard from './leaderboard.vue';
import BoatlistEditor from './boatlist-editor.vue';

export default {
  name: 'Leaderboards',
  components: {
    'control-leaderboard': ControlLeaderboard,
    'boatlist-editor': BoatlistEditor,
  },
  computed: {
    ...mapState({
      boatlists: state => state.ui.boatlists.boatlists,
    }),
  },
}
</script>

<style scoped>
#leaderboards {
  height: 100%;
  width: 100%;
}
</style>
