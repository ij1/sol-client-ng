<template>
  <div id="leaderboard">
    <div
      class = "leaderboard-header"
      @click = "onActivate"
    >
      {{ name }}
    </div>
    <div
      class = "leaderboard-boatlist-container"
      v-if = "this.active"
    >
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
          :search = "this.search"
          :boat-list = "this.boatList"
          :initial-selected = "this.selectedList"
          :hover-list = "this.hoverList"
          @select = "this.selectBoat"
          @input = "this.updateSelection"
        />
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
    boatlistIndex: {
      type: Number,
      required: true,
    },
  },
  data () {
    return {
      search: '',
    }
  },
  computed: {
    active () {
      return this.boatlistInfo.boatlistKey === this.activeBoatlist;
    },
    boatList () {
      let res = this.$store.state.race.fleet.boat;
      if (this.boatlistInfo.filter.boats !== null) {
        res = res.filter(i => this.boatlistInfo.filter.boats.includes(i.id));
      }
      // ADDME: distance filter
      return res;
    },
    name () {
      return this.boatlistInfo.name;
    },
    boatlistInfo () {
      return this.$store.state.ui.boatlists.boatlists[this.boatlistIndex];
    },
    ...mapState({
      activeBoatlist: state => state.ui.boatlists.activeList,
      selectedList: state => state.race.fleet.selected,
      hoverList: state => state.race.fleet.hover,
    }),
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
  },
  methods: {
    updateSelection (selectedList) {
      this.$store.commit('race/fleet/setSelected', selectedList);
    },
    selectBoat (e) {
      const position = this.fleetBoatFromId(e.boatId).latLng;
      EventBus.$emit('map-highlight', {
        latLng: position,
        keepMapPosition: e.altModifier,
      });
    },
    onActivate () {
      this.$store.commit('ui/boatlists/setActive',
                         this.boatlistInfo.boatlistKey);
    }
  },
}
</script>

<style scoped>
#leaderboard {
  position: relative;
  height: 100%;
  width: 100%;
  font-size: 11px;
  text-align: left;
  overflow: hidden;
}
.leaderboard-header {
  background-image: linear-gradient(#f0f0f0, #a0a0a0, #909090, #c0c0c0, #f0f0f0);
  padding: 5px;
  font-weight: bold;
}
.leaderboard-boatlist-container {
  position: relative;
  width: 100%;
  height: calc(100% - 64px);
}
#leaderboard-boatlist {
  width: 100%;
  height: 100%;
}
</style>
