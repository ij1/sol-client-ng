<template>
  <div id="leaderboard">
     <div class="leaderboard-header">
       {{ listname }}
     </div>
     <div class="leaderboard-search">
       Search
       <input
         class = "leadeboard-search-box"
         v-model = "filter"
       >
     </div>
     <div id="leaderboard-table">
     <table>
       <thead>
         <th @click="selectSort('ranking')">#</th>
         <th @click="selectSort('country')"></th>
         <th @click="selectSort('syc')"></th>
         <th @click="selectSort('name')">Name</th>
         <th @click="selectSort('dtg')">DTF</th>
         <th @click="selectSort('type')" v-if="showType">Boat Type</th>
       </thead>
       <tbody>
         <tr
           v-for = "boat in boatList"
           :key = "boat.id"
         >
           <td class="leaderboard-right">{{boat.ranking}}</td>
           <td class="leaderboard-left">{{boat.country}}</td>
           <td>{{boat.syc === true ? 't' : 'f'}}</td>
           <td class="leaderboard-left">{{boat.name}}</td>
           <td class="leaderboard-right">{{boat.dtg | prettyDtf}}</td>
           <td class="leaderboard-left" v-if="showType">{{boat.type}}</td>
         </tr>
       </tbody>
     </table>
     </div>
  </div>
</template>

<script>
export default {
  name: 'Leadeboard',
  data () {
    return {
      listname: 'Main Fleet',
      filter: '',
      sortKey: 'ranking',
      sortDir: 'asc',
      showType: true,
    }
  },
  filters: {
    prettyDtf (value) {
      return value.toFixed(2);
    }
  },
  computed: {
    boatList () {
      const dir = this.sortDir === 'asc' ? 1 : -1;
      const needle = this.filter.toLowerCase();

      return this.$store.state.race.fleet.boat.filter(boat => {
        return (this.filter.length === 0) ||
               boat.name.toLowerCase().includes(needle);
      }).sort((a, b) => {
        if (a[this.sortKey] < b[this.sortKey]) {
          return -dir;
        }
        if (a[this.sortKey] > b[this.sortKey]) {
          return dir;
        }
        return 0;
      });
    },
  },
  methods: {
    selectSort (column) {
      if (this.sortKey === column) {
        this.sortDir = (this.sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        this.sortKey = column;
        this.sortDir = 'asc';
      }
    }
  },
}
</script>

<style scoped>
#leaderboard {
  height: 800px;
  width: 100%;
}
.leaderboard-header, .leaderboard-search, .leaderboard-search input {
  font-size: 11px;
}
#leaderboard-table {
  float: bottom;
  width: 100%;
  height: 800px;
  font-size: 10px;
  white-space: nowrap;
  overflow: scroll;
}

.leaderboard-left {
  text-align: left;
}
.leaderboard-right {
  text-align: right;
}
</style>
