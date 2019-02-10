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
     <div id="leaderboard-table">
     <table cellspacing="0" cellpadding="1px">
       <thead>
         <th
           v-for = "column in visibleColumnsWithSort"
           :key = "column.dataField"
           @click="selectSort(column.dataField)"
         >
           {{column.thWithSort}}
         </th>
       </thead>
       <tbody id="leaderboard-body">
         <tr
           v-for = "boat in boatList"
           :key = "boat.id"
           :class = "{'active': selected.includes(boat.id), 'maphover': maphover.includes(boat.id)}"
           @click.exact = "selectBoat(boat.id, false)"
           @click.alt.exact = "selectBoat(boat.id, true)"
         >
           <td
             v-for = "column in visibleColumnsWithSort"
             :key = "column.dataField"
           >
             <country-flag
               v-if = "column.dataField === 'country'"
               :country = "boat[column.dataField]"
             />
             <syc-flag
               v-else-if = "column.dataField === 'syc'"
               :syc = "boat[column.dataField]"
             />
             <span v-else>
               {{boat[column.dataField] | prettyPrint(column) }}
             </span>
           </td>
         </tr>
       </tbody>
     </table>
     </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { EventBus } from '../../../lib/event-bus.js';
import CountryFlag from '../../countryflag.vue';
import SycFlag from '../../sycflag.vue';

export default {
  name: 'Leadeboard',
  components: {
    'country-flag': CountryFlag,
    'syc-flag': SycFlag,
  },
  data () {
    return {
      listname: 'Main Fleet',
      filter: '',
      sortKey: 'ranking',
      sortDir: 'asc',
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
    columns () {
      return [
        {dataField: 'ranking', th: '#', align: 'r', visible: true},
        {dataField: 'country', th: '', align: 'l', visible: true},
        {dataField: 'syc', th: '', align: 'l', visible: true},
        {dataField: 'name', th: 'Name', align: 'l', visible: true},
        {dataField: 'dtg', th: 'DTF', align: 'r', visible: true},
        {dataField: 'type', th: 'Boat Type', align: 'l', visible: this.multiClassRace},
      ];
    },
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
    selected () {
      return this.$store.state.race.fleet.selected;
    },
    maphover () {
      return this.$store.state.race.fleet.hover;
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      multiClassRace: 'race/fleet/multiClassRace',
    }),
  },
  methods: {
    selectSort (column) {
      if (this.sortKey === column) {
        this.sortDir = (this.sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        this.sortKey = column;
        this.sortDir = 'asc';
      }
    },
    selectBoat (id, keepMapPosition) {
      if (this.selected.includes(id)) {
        this.$store.commit('race/fleet/setSelected', []);
      } else {
        this.$store.commit('race/fleet/setSelected', [id]);

        const position = this.fleetBoatFromId(this.selected).latLng;
        EventBus.$emit('map-highlight', {
          latLng: position,
          keepMapPosition: keepMapPosition,
        });
      }
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
#leaderboard-table {
  width: 100%;
  height: calc(100% - 48px);
  font-size: 10px;
  white-space: nowrap;
  overflow-y: scroll;
}
#leaderboard-body tr {
  background: #ffffff;
}
#leaderboard-body .active {
  background: #d0d0ff;
}
#leaderboard-body .maphover {
  background: #e0e0ff;
}

.leaderboard-left {
  text-align: left;
}
.leaderboard-right {
  text-align: right;
}
</style>
