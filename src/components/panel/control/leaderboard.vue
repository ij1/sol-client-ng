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
         <th
           v-for = "column in visibleColumnsWithSort"
           :key = "column.dataField"
           @click="selectSort(column.dataField)"
         >
           {{column.thWithSort}}
         </th>
       </thead>
       <tbody>
         <tr
           v-for = "boat in boatList"
           :key = "boat.id"
         >
           <td
             v-for = "column in visibleColumnsWithSort"
             :key = "column.dataField"
           >
             {{boat[column.dataField] | prettyPrint(column) }}
           </td>
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
      columns: [
        {dataField: 'ranking', th: '#', align: 'r', visible: true},
        {dataField: 'country', th: '', align: 'l', visible: true},
        {dataField: 'syc', th: '', align: 'l', visible: true},
        {dataField: 'name', th: 'Name', align: 'l', visible: true},
        {dataField: 'dtg', th: 'DTF', align: 'r', visible: true},
        {dataField: 'type', th: 'Boat Type', align: 'l', visible: true},
      ],
    }
  },
  filters: {
    prettyPrint (value, column) {
      if (column.dataField === 'dtg') {
        return value.toFixed(2);
      } else if (column.dataField === 'syc') {
        return value === true ? 't' : 'f';
      }
      return value;
    }
  },
  computed: {
    visibleColumnsWithSort () {
      let cols = [];
      for (let i of this.columns) {
        if (!i.visible) {
          continue;
        }
        let sortVisualizer = '';
        if (i.dataField === this.sortKey) {
          sortVisualizer = this.sortDir === 'asc' ? '\u25b2' : '\u25bc';
        }
        cols.push({
          ...i,
          thWithSort: i.th + ' ' + sortVisualizer,
        });
      }
      return cols;
    },
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
