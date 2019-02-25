<template>
  <div id="leaderboard">
    <div class="leaderboard-header">
      {{ name }}
    </div>
    <div v-if = "this.boatlistInfo.boatlistKey === this.activeBoatlist">
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
  },
}
</script>

<style scoped>
#leaderboard {
  height: 100%;
  width: 100%;
}
.leaderboard-header, .leaderboard-search, .leaderboard-search input {
  font-size: 11px;
}
#leaderboard-boatlist {
  width: 100%;
  height: calc(100% - 48px);
}
</style>
