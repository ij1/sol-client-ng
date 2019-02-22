<template>
  <div id="leaderboard">
    <div class="leaderboard-header">
      {{ listname }}
      <div class="leaderboard-search">
        <label for="search">Search</label>
        <input
          id = "search"
          class = "leadeboard-search-box"
          v-model = "filter"
        >
      </div>
    </div>
    <boat-list
      :filter = "this.filter"
      :boat-list = "this.boatList"
      @select-boat = "this.selectBoat"
    />
  </div>
</template>

<script>
import { EventBus } from '../../../lib/event-bus.js';
import BoatList from './boatlist.vue';

export default {
  name: 'Leadeboard',
  components: {
    'boat-list': BoatList,
  },
  data () {
    return {
      listname: 'Main Fleet',
      filter: '',
    }
  },
  computed: {
    boatList () {
      return this.$store.state.race.fleet.boat;
    }
  },
  methods: {
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
</style>
