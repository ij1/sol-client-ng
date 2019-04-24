<template>
  <scrollable-table id = "boatlist-table">
    <template slot = "headers">
      <th
        v-for = "column in visibleColumnsWithSort"
        :key = "column.dataField"
        @click="selectSort(column.dataField, column.localeSort)"
      >
        {{column.thWithSort}}
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
      @click.prevent = "selectBoat(index, $event)"
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
        return value.toFixed(2);
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
      } else if (select) {
        Vue.set(this.selected, id, true);
        this.$emit('select', {
          boatId: id,
          altModifier: ev.altKey,
        });
      }
      this.$emit('input', this.selected);
      this.lastClicked = id;
    },
  },
}
</script>

<style scoped>
#boatlist-table {
  width: 100%;
  height: 100%;
  font-size: 10px;
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
}
</style>
