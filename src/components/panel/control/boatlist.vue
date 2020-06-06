<template>
  <scrollable-table id = "boatlist-table" ref = "boatlist-table">
    <template v-slot:headers>
      <th
        v-for = "column in visibleColumnsWithSort"
        :key = "column.dataField"
        @click="selectSort(column.dataField, column.localeSort)"
        :class = "{
          'boatlist-left': column.align === 'l',
          'boatlist-right': column.align === 'r'
        }"
      >
        {{column.thWithSort}}
      </th>
    </template>
    <template v-slot:dummydata>
      <th
        v-for = "column in visibleColumnsWithSort"
        :key = "'d' + column.dataField"
      >
        <span v-html="column.dummyData"/>
      </th>
    </template>
    <tr
      v-for = "(boat, index) in sortedBoatList"
      :key = "boat.id"
      class = "boatlist-row"
      :class = "{
        'boatlist-active': typeof selected[boat.id] !== 'undefined',
        'boatlist-hover': typeof hoverList[boat.id] !== 'undefined',
        'boatlist-last': boat.id === lastClicked
      }"
      @mousedown.prevent
      @mouseup.prevent = "selectBoat(index, $event)"
      @mouseover = "hoverBoat(index, $event)"
      @mouseout = "clearHover()"
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
  </scrollable-table>
</template>

<script>
import Vue from 'vue';
import { mapGetters } from 'vuex';
import ScrollableTable from './scrollabletable.vue';
import CountryFlag from '../../countryflag.vue';
import SycFlag from '../../sycflag.vue';
import { roundToFixed } from '../../../lib/quirks.js';
import { solBoatPolicy, PR_MARK_BOAT } from '../../../lib/sol.js';

export default {
  name: 'BoatList',
  components: {
    'scrollable-table': ScrollableTable,
    'country-flag': CountryFlag,
    'syc-flag': SycFlag,
  },
  props: {
    search: {
      type: String,
      default: '',
    },
    boatList: {
      type: Array,
      required: true,
    },
    initialSelected: {
      type: Object,
      default: () => ({}),
    },
    hoverList: {
      type: Object,
      default: () => ({}),
    },
    enableHover: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      selected: this.initialSelected,
      lastClicked: null,
      sortKey: 'ranking',
      sortDir: 'asc',
      localeSort: false,
    }
  },
  filters: {
    prettyPrint (value, column) {
      if (column.dataField === 'dtg') {
        return roundToFixed(value, 2);
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
          dummyData: '9999',
        },
        {
          dataField: 'country', th: '',
          align: 'l', visible: true, localeSort: false,
          dummyData: 'SE',
        },
        {
          dataField: 'syc', th: '',
          align: 'l', visible: true, localeSort: false,
          dummyData: 'y',
        },
        {
          dataField: 'name', th: 'Name',
          align: 'l', visible: true, localeSort: true,
          dummyData: PR_MARK_BOAT + '5',
        },
        {
          dataField: 'dtg', th: 'DTF\xa0\xa0',
          align: 'r', visible: true, localeSort: false,
          dummyData: '19999.99',
        },
        {
          dataField: 'type', th: 'Boat Type',
          align: 'l', visible: this.multiClassRace, localSort: false,
          dummyData: 'class',
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
      const needle = this.search.toLowerCase();

      return this.boatList.filter(boat => {
        return (this.search.length === 0) ||
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
    ...mapGetters({
      multiClassRace: 'race/fleet/multiClassRace',
      fleetBoatFromId: 'race/fleet/boatFromId',
      currentFilter: 'ui/boatlists/currentFilter',
      applyFilterToBoat: 'ui/boatlists/applyFilterToBoat',
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
    selectBoat (index, ev) {
      let id = this.sortedBoatList[index].id;
      let select = true;

      if (!ev.ctrlKey) {
        if (typeof this.selected[id] !== 'undefined') {
          select = false;
        }
        this.selected = {};
      }

      if (ev.shiftKey) {
        let i;
        for (i = 0; i < this.sortedBoatList.length; i++) {
          if (this.sortedBoatList[i].id === this.lastClicked) {
            break;
          }
        }
        if ((i < this.sortedBoatList.length) &&
            (this.sortedBoatList[i].id === this.lastClicked)) {
          while (i !== index) {
            Vue.set(this.selected, this.sortedBoatList[i].id, true);
            i += Math.sign(index - i);
          }
          Vue.set(this.selected, id, true);
        }

      } else if (typeof this.selected[id] !== 'undefined') {
        Vue.delete(this.selected, id);
        this.clearHover();
      } else if (select) {
        Vue.set(this.selected, id, true);
        this.$emit('select', {
          boatId: id,
          altModifier: ev.altKey,
        });
      } else {
        this.clearHover();
      }
      this.$emit('input', this.selected);
      this.lastClicked = id;
    },
    hoverBoat (index) {
      if (!this.enableHover) {
        return;
      }
      const id = this.sortedBoatList[index].id;
      const boat = this.fleetBoatFromId(id);
      if (!solBoatPolicy(boat.name, this.$store.getters)) {
        return;
      }
      if (this.currentFilter !== null) {
        if (!this.applyFilterToBoat(boat)) {
          return;
        }
      }
      let obj = {};
      obj['' + id] = true;
      this.$store.commit('race/fleet/setHover', obj);
    },
    clearHover () {
      if (!this.enableHover) {
        return;
      }
      this.$store.commit('race/fleet/setHover', {});
    },
  },
  watch: {
    sortedBoatList () {
      this.$refs['boatlist-table'].dataUpdated();
    },
  },
}
</script>

<style scoped>
#boatlist-table {
  width: 100%;
  height: 100%;
  font-size: 11px;
}
.boatlist-row {
  background: #ffffff;
}
.boatlist-active {
  background: #d0d0ff;
}
.boatlist-hover {
  background: #e0e0ff;
}
.boatlist-last {
  outline: 1px dotted #333;
  outline-offset: -1px;
}

.boatlist-left {
  text-align: left;
}
.boatlist-right {
  text-align: right;
  padding-right: 7px;
}
</style>
