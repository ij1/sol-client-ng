<template>
  <scrollable-table id = "countrylist-table">
    <template v-slot:headers>
      <th
        v-for = "(column, index) in visibleColumnsWithSort"
        :key = "column.dataField + '_' + index"
        @click="selectSort(column.dataField, column.localeSort)"
        :class = "{
          'countrylist-left': column.align === 'l',
          'countrylist-right': column.align === 'r'
        }"
      >
        {{column.thWithSort}}
      </th>
    </template>
    <template v-slot:dummydata>
      <th
        v-for = "(column, index) in visibleColumnsWithSort"
        :key = "'d' + column.dataField + '_' + index"
      >
        <span v-html="column.dummyData"/>
      </th>
    </template>
    <tr
      v-for = "(country, index) in sortedCountryList"
      :key = "country.country"
      class = "countrylist-row"
      :class = "{
        'countrylist-active': typeof selected[country.country] !== 'undefined',
        'countrylist-last': country.country === lastClicked
      }"
      @mousedown.prevent
      @click.prevent = "selectCountry(index, $event)"
    >
      <td
        v-for = "(column, index) in visibleColumnsWithSort"
        :key = "column.dataField + '_' + index"
        :class = "{
          'countrylist-left': column.align === 'l',
          'countrylist-right': column.align === 'r'
        }"
      >
        <country-flag
          v-if = "column.dataField === 'country' && index === 0"
          :country = "country[column.dataField]"
        />
        <span v-else>
          {{country[column.dataField] }}
        </span>
      </td>
    </tr>
  </scrollable-table>
</template>

<script>
import Vue from 'vue';
import ScrollableTable from './scrollabletable.vue';
import CountryFlag from '../../countryflag.vue';

export default {
  name: 'CountryList',
  components: {
    'scrollable-table': ScrollableTable,
    'country-flag': CountryFlag,
  },
  props: {
    search: {
      type: String,
      default: '',
    },
    countryList: {
      type: Array,
      required: true,
    },
  },
  data () {
    return {
      selected: {},
      lastClicked: null,
      sortKey: 'country',
      sortDir: 'asc',
      localeSort: false,
    }
  },
  computed: {
    columns () {
      return [
        {
          dataField: 'country', th: '',
          align: 'l', visible: true, localeSort: false,
          dummyData: 'code',
        },
        {
          dataField: 'country', th: 'code',
          align: 'l', visible: true, localeSort: false,
          dummyData: 'code',
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
    sortedCountryList () {
      const dir = this.sortDir === 'asc' ? 1 : -1;
      const needle = this.search.toLowerCase();

      return this.countryList.filter(country => {
        return (this.search.length === 0) ||
               country.country.toLowerCase().includes(needle);
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
    selectCountry (index, ev) {
      let id = this.sortedCountryList[index].country;
      let select = true;

      if (!ev.ctrlKey) {
        if (typeof this.selected[id] !== 'undefined') {
          select = false;
        }
        this.selected = {};
      }

      if (ev.shiftKey) {
        let i;
        for (i = 0; i < this.sortedCountryList.length; i++) {
          if (this.sortedCountryList[i].country === this.lastClicked) {
            break;
          }
        }
        if ((i < this.sortedCountryList.length) &&
            (this.sortedCountryList[i].country === this.lastClicked)) {
          while (i !== index) {
            Vue.set(this.selected, this.sortedCountryList[i].country, true);
            i += Math.sign(index - i);
          }
          Vue.set(this.selected, id, true);
        }

      } else if (typeof this.selected[id] !== 'undefined') {
        Vue.delete(this.selected, id);
      } else if (select) {
        Vue.set(this.selected, id, true);
        this.$emit('select', {
          countryId: id,
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
#countrylist-table {
  width: 100%;
  height: 100%;
  font-size: 10px;
}
.countrylist-row {
  background: #ffffff;
}
.countrylist-active {
  background: #d0d0ff;
}
.countrylist-last {
  outline: 1px dotted #333;
  outline-offset: -1px;
}

.countrylist-left {
  text-align: left;
}
.countrylist-right {
  text-align: right;
}
</style>
