<template>
  <div id="boatlist-table">
    <table cellspacing="0" cellpadding="1px">
      <thead>
        <th
          v-for = "column in visibleColumnsWithSort"
          :key = "column.dataField"
          @click="selectSort(column.dataField, column.localeSort)"
        >
          {{column.thWithSort}}
        </th>
      </thead>
      <tbody id="boatlist-body">
        <tr
          v-for = "boat in sortedBoatList"
          :key = "boat.id"
          :class = "{
            'active': selected.includes(boat.id),
            'listhover': hover.includes(boat.id)
          }"
          @click.exact = "selectBoat(boat.id, false)"
          @click.alt.exact = "selectBoat(boat.id, true)"
        >
          <td
            v-for = "column in visibleColumnsWithSort"
            :key = "column.dataField"
            :class = "{
              'boatlist-left': column.align === 'l',
              'boatlist-right': column.align === 'r'
            }"
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
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import CountryFlag from '../../countryflag.vue';
import SycFlag from '../../sycflag.vue';

export default {
  name: 'BoatList',
  components: {
    'country-flag': CountryFlag,
    'syc-flag': SycFlag,
  },
  props: {
    filter: {
      type: String,
      default: '',
    },
    boatList: {
      type: Array,
      required: true,
    },
  },
  data () {
    return {
      sortKey: 'ranking',
      sortDir: 'asc',
      localeSort: false,
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
        {
          dataField: 'ranking', th: '#',
          align: 'r', visible: true, localeSort: false,
        },
        {
          dataField: 'country', th: '',
          align: 'l', visible: true, localeSort: false,
        },
        {
          dataField: 'syc', th: '',
          align: 'l', visible: true, localeSort: false,
        },
        {
          dataField: 'name', th: 'Name',
          align: 'l', visible: true, localeSort: true,
        },
        {
          dataField: 'dtg', th: 'DTF',
          align: 'r', visible: true, localeSort: false,
        },
        {
          dataField: 'type', th: 'Boat Type',
          align: 'l', visible: this.multiClassRace, localSort: false,
        },
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
    sortedBoatList () {
      const dir = this.sortDir === 'asc' ? 1 : -1;
      const needle = this.filter.toLowerCase();

      return this.boatList.filter(boat => {
        return (this.filter.length === 0) ||
               boat.name.toLowerCase().includes(needle);
      }).sort((a, b) => {
        if (!this.localeSort) {
          if (a[this.sortKey] < b[this.sortKey]) {
            return -dir;
          }
          if (a[this.sortKey] > b[this.sortKey]) {
            return dir;
          }
          return 0;
        } else {
          return dir * a[this.sortKey].localeCompare(b[this.sortKey]);
        }
      });
    },
    ...mapState({
      selected: state => state.race.fleet.selected,
      hover: state => state.race.fleet.hover,
    }),
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      multiClassRace: 'race/fleet/multiClassRace',
    }),
  },
  methods: {
    selectSort (column, localeSort) {
      if (this.sortKey === column) {
        this.sortDir = (this.sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        this.sortKey = column;
        this.sortDir = 'asc';
      }
      this.localeSort = localeSort;
    },
    selectBoat (id, altModifier) {
      if (this.selected.includes(id)) {
        this.$store.commit('race/fleet/setSelected', []);
      } else {
        this.$store.commit('race/fleet/setSelected', [id]);
        this.$emit('select-boat', {
          boatId: this.selected,
          altModifier: altModifier
        });
      }
    }
  },
}
</script>

<style scoped>
#boatlist-table {
  width: 100%;
  height: calc(100% - 48px);
  font-size: 10px;
  white-space: nowrap;
  overflow-y: scroll;
}
#boatlist-body tr {
  background: #ffffff;
}
#boatlist-body .active {
  background: #d0d0ff;
}
#boatlist-body .listhover {
  background: #e0e0ff;
}

.boatlist-left {
  text-align: left;
}
.boatlist-right {
  text-align: right;
}
</style>
