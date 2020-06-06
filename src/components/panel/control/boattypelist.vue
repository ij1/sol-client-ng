<template>
  <scrollable-table id = "boattypelist-table">
    <template v-slot:headers>
      <th
        v-for = "(column, index) in visibleColumnsWithSort"
        :key = "column.dataField + '_' + index"
        @click="selectSort(column.dataField, column.localeSort)"
        :class = "{
          'boattypelist-left': column.align === 'l',
          'boattypelist-right': column.align === 'r'
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
      v-for = "(boattype, index) in sortedBoattypeList"
      :key = "boattype.boattype"
      class = "boattypelist-row"
      :class = "{
        'boattypelist-active': typeof selected[boattype.boattype] !== 'undefined',
        'boattypelist-last': boattype.boattype === lastClicked
      }"
      @mousedown.prevent
      @click.prevent = "selectBoattype(index, $event)"
    >
      <td
        v-for = "(column, index) in visibleColumnsWithSort"
        :key = "column.dataField + '_' + index"
        :class = "{
          'boattypelist-left': column.align === 'l',
          'boattypelist-right': column.align === 'r'
        }"
      >
        {{ boattype[column.dataField] }}
      </td>
    </tr>
  </scrollable-table>
</template>

<script>
import Vue from 'vue';
import ScrollableTable from './scrollabletable.vue';

export default {
  name: 'BoattypeList',
  components: {
    'scrollable-table': ScrollableTable,
  },
  props: {
    search: {
      type: String,
      default: '',
    },
    boattypeList: {
      type: Array,
      required: true,
    },
  },
  data () {
    return {
      selected: {},
      lastClicked: null,
      sortKey: 'boattype',
      sortDir: 'asc',
      localeSort: false,
    }
  },
  computed: {
    columns () {
      return [
        {
          dataField: 'boattype', th: '',
          align: 'l', visible: true, localeSort: false,
          dummyData: '',
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
    sortedBoattypeList () {
      const dir = this.sortDir === 'asc' ? 1 : -1;
      const needle = this.search.toLowerCase();

      return this.boattypeList.filter(boattype => {
        return (this.search.length === 0) ||
               boattype.boattype.toLowerCase().includes(needle);
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
    selectBoattype (index, ev) {
      let id = this.sortedBoattypeList[index].boattype;
      let select = true;

      if (!ev.ctrlKey) {
        if (typeof this.selected[id] !== 'undefined') {
          select = false;
        }
        this.selected = {};
      }

      if (ev.shiftKey) {
        let i;
        for (i = 0; i < this.sortedBoattypeList.length; i++) {
          if (this.sortedBoattypeList[i].boattype === this.lastClicked) {
            break;
          }
        }
        if ((i < this.sortedBoattypeList.length) &&
            (this.sortedBoattypeList[i].boattype === this.lastClicked)) {
          while (i !== index) {
            Vue.set(this.selected, this.sortedBoattypeList[i].boattype, true);
            i += Math.sign(index - i);
          }
          Vue.set(this.selected, id, true);
        }

      } else if (typeof this.selected[id] !== 'undefined') {
        Vue.delete(this.selected, id);
      } else if (select) {
        Vue.set(this.selected, id, true);
        this.$emit('select', {
          boattype: id,
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
#boattypelist-table {
  width: 100%;
  height: 100%;
  font-size: 11px;
}
.boattypelist-row {
  background: #ffffff;
}
.boattypelist-active {
  background: #d0d0ff;
}
.boattypelist-last {
  outline: 1px dotted #333;
  outline-offset: -1px;
}

.boattypelist-left {
  text-align: left;
}
.boattypelist-right {
  text-align: right;
}
</style>
