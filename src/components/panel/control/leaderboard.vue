<template>
  <div id="leaderboard" :style="{flex: active ? 'auto' : 'none'}">
    <div
      class = "leaderboard-header"
      @click = "onActivate"
    >
      {{ name }}
    </div>
    <div
      class = "leaderboard-boatlist-container"
      :style = "{
        height: 'calc(100% - 68px - ' + (listEditable ? 41 : 0) + 'px)'
      }"
      v-if = "active"
    >
      <div v-if = "listEditable" style="text-align: right">
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
          v-model = "search"
        >
      </div>
      <div id = "leaderboard-boatlist">
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
import { solBoatPolicy } from '../../../lib/sol.js';
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
      if (this.boatlistInfo.filter.boats !== null) {
        res = res.filter(i => {
          return this.boatlistInfo.filter.boats.has(i.name);
        });
      }
      if (this.boatlistInfo.filter.distance !== null) {
        res = res.filter(i => i.distance <= this.boatlistInfo.filter.distance);
      }
      if (this.boatlistInfo.filter.country !== null) {
        res = res.filter(i => {
          return this.boatlistInfo.filter.country.has(i.country);
        });
      }
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
      fleetBoatFromId: 'race/fleet/boatFromId',
      selectedObj: 'race/fleet/selectedFiltered',
      currentFilter: 'ui/boatlists/currentFilter',
      applyFilterToBoat: 'ui/boatlists/applyFilterToBoat',
    }),
  },
  methods: {
    updateSelection (newSelected) {
      /* Make sure the inputted object is not shared into vuex */
      newSelected = Object.assign({}, newSelected);
      this.$store.commit('race/fleet/setSelected', newSelected);
    },
    selectBoat (e) {
      const boat = this.fleetBoatFromId(e.boatId);
      if (!solBoatPolicy(boat.name, this.$store.getters)) {
        return;
      }
      if (this.currentFilter && !this.applyFilterToBoat(boat)) {
        return;
      }
      const position = boat.latLng;
      EventBus.$emit('map-highlight', {
        latLng: position,
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
  font-weight: bold;
}
.leaderboard-boatlist-container {
  position: relative;
  width: 100%;
}
.leaderboard-search input {
  font-size: 11px;
}
#leaderboard-boatlist {
  width: 100%;
  height: 100%;
}
.leaderboard-buttons {
  text-align: right;
}
.leaderboard-buttons button {
  font-size: 11px;
  margin: 2px;
}
</style>
