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
    <boat-list :filter="this.filter" :boat-list="this.boatList"/>
  </div>
</template>

<script>
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
