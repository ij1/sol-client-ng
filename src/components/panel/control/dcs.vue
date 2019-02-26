<template>
  <div id="dc-control">
    <div id="dc-header">
      <button
        @click="doEdit"
        :disabled = "!this.canEdit"
      >
        Edit
      </button>
      <button
        @click="doDelete"
        :disabled = "!this.canDelete"
      >
        Delete
      </button>
      <button @click="doRefresh">Refresh</button>
    </div>
    <scrollable-table id = "dc-table">
      <template slot = "headers">
        <th>Time</th>
        <th>Type</th>
        <th>&deg;</th>
      </template>
      <tr
        v-for = "command in this.$store.state.boat.steering.dcs.list"
        v-bind:key = "command.id"
        :class = "{'active': command.id === selected }"
        @click = "selectDC(command.id)"
      >
        <td>{{ command.time | msecToUTCString }}</td>
        <td>{{ command.type | cctocog }}</td>
        <td>{{ command | formatValue }}</td>
      </tr>
    </scrollable-table>
    <portal to="dc-editor-dest" v-if="this.dcToEdit !== null">
      <dc-editor
        :dc-to-edit = "this.dcToEdit"
        @close = "dcToEdit = null"
      />
    </portal>
  </div>
</template>

<script>
import { radToDeg, msecToUTCString } from '../../../lib/utils.js';
import { dcTwaTextPrefix } from '../../../lib/nav.js';
import ScrollableTable from './scrollabletable.vue';
import DcEditor from './dceditor.vue';

export default {
  name: 'ControlDCs',
  components: {
    'scrollable-table': ScrollableTable,
    'dc-editor': DcEditor,
  },
  data () {
    return {
      loading: true,
      commands: null,
      selected: null,
      dcToEdit: null,
    }
  },
  filters: {
    msecToUTCString (msec) {
      return msecToUTCString(msec);
    },
    formatValue (dc) {
      return dcTwaTextPrefix(dc) + radToDeg(dc.value).toFixed(3);
    },
    cctocog (type) {
      return type === 'cc' ? 'cog' : type;
    },
  },
  computed: {
    canEdit () {
      return (this.selectedDC !== null) && (this.dcToEdit === null);
    },
    canDelete () {
      return this.selectedDC !== null;
    },
    selectedDC () {
      if (this.selected === null) {
        return null;
      }
      for (let dc of this.$store.state.boat.steering.dcs.list) {
        if (dc.id === this.selected) {
          return dc;
        }
      }
      return null;
    }
  },
  methods: {
    doRefresh () {
      this.$store.dispatch('boat/steering/fetchDCs');
    },
    doDelete () {
      if (this.selectedDC === null) {
        return;
      }
      this.$store.dispatch('boat/steering/sendDeleteDC', {id: this.selected})
      .then(status => {
        if (status !== 'OK') {
          this.$store.dispatch('notifications/add', {
            text: 'Delete DC send failed!',
            color: 'red',
          });
        }
        this.$store.dispatch('boat/steering/fetchDCs');
	// ADDME: It would be useful to notify DC editor if it has the same
	// DC open ATM
      });
    },
    doEdit () {
      if (!this.canEdit) {
        return;
      }
      this.dcToEdit = Object.assign({}, this.selectedDC);
    },
    selectDC (id) {
      this.selected = (this.selected === id) ? null : id;
    }
  },
  watch: {
    selectedDC (newValue) {
      /* The selected DC not found anymore, clear the stale selection */
      if ((newValue === null) && (this.selected !== null)) {
        this.selected = null;
      }
    },
  }
}
</script>

<style scoped>
#dc-control {
  height: 100%;
  width: 100%;
}
#dc-header button {
  margin: 2px;
}
#dc-table {
  font-size: 10px;
  height: calc(100% - 32px);
}
#dc-table tr {
  background: #ffffff;
}
#dc-table .active {
  background: #d0d0ff;
}
</style>
