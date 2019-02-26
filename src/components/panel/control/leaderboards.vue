<template>
  <div id="leaderboards">
    <control-leaderboard
      v-for = "(leaderboard, index) in this.boatlists"
      :key = "leaderboard.boatlistKey"
      :boatlist-index = "index"
    />
    <div>
      Create new list by:
      <button @click = "editorType = 'boat'">Boat</button>
      <button @click = "editorType = 'distance'">Distance</button>
    </div>
    <portal to = "boatlist-editor-dest" v-if = "this.editorType !== null">
      <boatlist-editor
        :editor-type = "editorType"
        @close = "editorType = null"
      />
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
  data () {
    return {
      editorType: null,
    }
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
