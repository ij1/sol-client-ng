<template>
  <div id="leaderboards-container">
    <div id="leaderboards">
      <control-leaderboard
        v-for = "(leaderboard, index) in this.boatlists"
        :key = "leaderboard.boatlistKey"
        :boatlist-index = "index"
        @editlist = "doEditList"
      />
      <div id = "leaderboard-createbuttons">
        Create new list by:
        <button @click = "editorType = 'boat'">Boat</button>
        <button @click = "editorType = 'distance'">Distance</button>
      </div>
    </div>
    <portal to = "boatlist-editor-dest" v-if = "this.editorType !== null">
      <boatlist-editor
        :editor-type = "editorType"
        :edit-list-key = "editListKey"
        @close = "doClose"
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
      editListKey: null,
    }
  },
  computed: {
    ...mapState({
      boatlists: state => state.ui.boatlists.boatlists,
    }),
  },
  methods: {
    doEditList (boatListKey) {
      this.editorType = 'edit';
      this.editListKey = boatListKey;
    },
    doClose () {
      this.editorType = null;
      this.editListKey = null;
    }
  },
}
</script>

<style scoped>
#leaderboards-container, #leaderboards {
  height: 100%;
  width: 100%;
}
#leaderboards {
  display: flex;
  flex-direction: column;
}
#leaderboard-createbuttons {
  flex: none;
  overflow: hidden;
  font-size: 10px;
}
#leaderboard-createbuttons button {
  font-size: 10px;
  margin-left: 4px;
}
</style>
