<template>
  <div id="leaderboards-container">
    <div id="leaderboards">
      <control-leaderboard
        v-for = "boatlistKey in sortedBoatlistKeys"
        :key = "boatlistKey"
        :boatlist-key = "boatlistKey"
        @editlist = "doEditList"
      />
      <div id = "leaderboard-createbuttons">
        <span id = "leaderboard-createbuttons-label">Create new list by:</span>
        <div id = "leaderboard-createbuttons-buttoncontainer">
          <button @click = "editorType = 'boat'">Boat</button>
          <button @click = "editorType = 'distance'">Distance</button>
          <button @click = "editorType = 'country'">Country</button>
          <button
            v-if = "multiClassRace"
            @click = "editorType = 'boattype'"
          >
            Boat Type
          </button>
        </div>
      </div>
    </div>
    <portal to = "boatlist-editor-dest" v-if = "editorType !== null">
      <boatlist-editor
        :editor-type = "editorType"
        :edit-list-key = "editListKey"
        :seed-list-key = "activeList"
        @close = "doClose"
      />
    </portal>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
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
    sortedBoatlistKeys () {
      return Object.keys(this.boatlists).sort((a, b) => {
        return a - b;
      });
    },
    ...mapState({
      boatlists: state => state.ui.boatlists.boatlists,
      activeList: state => state.ui.boatlists.activeList,
    }),
    ...mapGetters({
      multiClassRace: 'race/fleet/multiClassRace',
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
  font-size: 11px;
  display: flex;
  flex-direction: row;
  padding-top: 4px;
}
#leaderboard-createbuttons-buttoncontainer {
  min-width: 90px;
  flex: auto;
  display: inline-block;
  text-align: left;
}
#leaderboard-createbuttons-label {
  flex: none;
}
#leaderboard-createbuttons button {
  font-size: 11px;
  margin-left: 4px;
  padding: 0px;
}
</style>
