<template>
  <div id="leaderboard" :style="{flex: active ? '1 1' : 'none'}">
    <div
      class = "leaderboard-header"
      @click = "onActivate"
    >
      {{ name }}
    </div>
    <div
      class = "leaderboard-boatlist-container"
      v-if = "active"
    >
      <div v-if = "listEditable" class = "leaderboard-showonly">
        <input
          type = "checkbox"
          :checked = "showOnly"
          @change = "onShowOnly($event.target.checked)"
        />
        Show only boats from this list
      </div>
      <div class="leaderboard-search">
        <label for="search">Search</label>
        <input
          id = "search"
          class = "leadeboard-search-box"
          autocompletion = "off"
          autocorrect = "off"
          autocapitalize = "off"
          spellcheck = "false"
          v-model = "search"
        />
      </div>
      <div
        id = "leaderboard-boatlist"
        :style = "{
          height: 'calc(100% - 29px - ' + (listEditable ? 23+4+23 : 0) + 'px)'
        }"
      >
        <boat-list
          :search = "search"
          :boat-list = "boatList"
          :initial-selected = "selectedObj"
          :hover-list = "hoverList"
          :enable-hover = "true"
          @select = "selectBoat"
          @input = "updateSelection"
        />
      </div>
      <div class = "leaderboard-buttons" v-if = "listEditable">
        <button @click = "onEdit">Edit list</button>
        <button @click = "onDelete">Delete list</button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { EventBus } from '../../../lib/event-bus.js';
import BoatList from './boatlist.vue';

export default {
  name: 'Leadeboard',
  components: {
    'boat-list': BoatList,
  },
  props: {
    boatlistKey: {
      type: String,
      required: true,
    },
  },
  data () {
    return {
      search: '',
    }
  },
  computed: {
    listEditable () {
      return this.boatlistInfo.editable;
    },
    showOnly () {
      return this.boatlistKey === this.filterListKey;
    },
    active () {
      return this.boatlistKey === this.activeBoatlist;
    },
    boatList () {
      let res = this.$store.state.race.fleet.boat;
      this.boatlistInfo.filter.filterStamp;

      res = res.filter(i => {
        return (this.isPracticePeriod || !i.practiceMark) &&

               ((this.boatlistInfo.filter.boats === null ||
                 this.boatlistInfo.filter.boats.has(i.name)) &&

                (this.boatlistInfo.filter.distance === null ||
                 i.distance <= this.boatlistInfo.filter.distance) &&

                (this.boatlistInfo.filter.country === null ||
                 this.boatlistInfo.filter.country.has(i.country)) &&

                (this.boatlistInfo.filter.boattype === null ||
                 this.boatlistInfo.filter.boattype.has(i.type)));
      });

      return res;
    },
    name () {
      return this.boatlistInfo.name;
    },
    boatlistInfo () {
      return this.boatlists[this.boatlistKey];
    },
    ...mapState({
      boatlists: state => state.ui.boatlists.boatlists,
      activeBoatlist: state => state.ui.boatlists.activeList,
      filterListKey: state => state.ui.boatlists.filterList,
      hoverList: state => state.race.fleet.hover,
    }),
    ...mapGetters({
      selectedObj: 'race/fleet/selectedFiltered',
      isPracticePeriod: 'race/isPracticePeriod',
    }),
  },
  methods: {
    updateSelection (newSelected) {
      /* Make sure the inputted object is not shared into vuex */
      newSelected = Object.assign({}, newSelected);
      this.$store.commit('race/fleet/setSelected', newSelected);
    },
    selectBoat (e) {
      EventBus.$emit('map-highlight', {
        boatId: e.boatId,
        keepMapPosition: e.altModifier,
      });
    },
    onActivate () {
      this.$store.commit('ui/boatlists/setActive',
                         this.boatlistKey);
    },
    onShowOnly (value) {
      this.$store.commit('ui/boatlists/setFilterList',
                         value ? this.boatlistKey : null);
    },
    onDelete () {
      this.$store.commit('ui/boatlists/delete',
                         this.boatlistKey);
    },
    onEdit () {
      this.$emit('editlist', this.boatlistKey);
    },
  },
}
</script>

<style scoped>
#leaderboard {
  position: relative;
  width: 100%;
  font-size: 11px;
  text-align: left;
  overflow: hidden;
  min-height: 0;
}
.leaderboard-header {
  background-image: linear-gradient(#f0f0f0, #a0a0a0, #909090, #c0c0c0, #f0f0f0);
  padding: 5px;
  height: 15px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
}
.control-panel-dark .leaderboard-header {
  background-image: linear-gradient(#101040, #303060, #505070, #303060, #101040);
}
.leaderboard-showonly {
  text-align: right;
  height: 23px;
  white-space: nowrap;
  overflow: hidden;
}
.leaderboard-boatlist-container {
  position: relative;
  width: 100%;
  height: calc(100% - 25px);
}
.leaderboard-search {
  position: relative;
  display: flex;
  flex-direction: row;
  height: 23px;
  overflow: hidden;
}
.leaderboard-search label {
  flex: none;
}
.leaderboard-search input {
  flex: auto;
  font-size: 11px;
  background-color: unset;
  margin: 2px;
  margin-left: 6px;
  min-width: 50px;
}
#leaderboard-boatlist {
  position: relative;
  width: 100%;
}
.leaderboard-buttons {
  display: flex;
  flex-direction: row;
  padding-top: 4px;
  height: 23px;
  overflow: hidden;
}
.leaderboard-buttons button {
  flex: auto;
  font-size: 11px;
  min-width: 40px;
  white-space: nowrap;
  overflow: hidden;
}
</style>
