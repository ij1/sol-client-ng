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
        :disabled = "this.$store.state.boat.steering.sending"
      >
        Delete
      </button>
      <button @click="doRefresh">Refresh</button>
    </div>
    <div id="dc-table">
      <table>
        <thead>
          <tr>
            <td>Time</td>
            <td>Type</td>
            <td>&deg;</td>
          </tr>
        </thead>
        <tbody id="dc-list">
          <tr
            v-for = "command in this.$store.state.boat.steering.dcs.list"
            v-bind:key = "command.id"
            :class = "{'active': command.id === selected }"
            @click = "selectDC(command.id)"
          >
            <td>{{ command.time | msecToUTCString }}</td>
            <td>{{ command.type | cctocog }}</td>
            <td>{{ command.value | degrees }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <portal to="dc-editor-dest" v-if="this.dcToEdit !== null">
      <dc-editor :dc-to-edit = "this.dcToEdit" :real-parent="this"/>
    </portal>
  </div>
</template>

<script>
import { radToDeg, msecToUTCString } from '../../../lib/utils.js';
import DcEditor from './dceditor.vue';

export default {
  name: 'ControlDCs',
  components: {
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
    degrees (radians) {
      return radToDeg(radians).toFixed(2);
    },
    cctocog (type) {
      return type === 'cc' ? 'cog' : type;
    },
  },
  computed: {
    canEdit () {
      return (this.selected !== null) && (this.dcToEdit === null);
    },
  },
  methods: {
    doRefresh () {
      this.$store.dispatch('boat/steering/fetchDCs');
    },
    doDelete () {
      if (this.selected === null) {
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
      });
    },
    doEdit () {
      if (!this.canEdit) {
        return;
      }
      let origDc = null;
      for (let dc of this.$store.state.boat.steering.dcs.list) {
        if (dc.id === this.selected) {
          origDc = dc;
          break;
        }
      }
      /* No DC found, refetch them and clear selection */
      if (origDc === null) {
        this.selected = null;
        this.$store.dispatch('boat/steering/fetchDCs');
      }
      this.dcToEdit = Object.assign({}, origDc);
    },
    selectDC (id) {
      this.selected = (this.selected === id) ? null : id;
    }
  }
}
</script>

<style scoped>
#dc-control {
  height: 800px;
  width: 100%;
}
#dc-header button {
  margin: 2px;
}
#dc-table {
  float: bottom;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  font-size: 10px;
}
#dc-list tr {
  background: #ffffff;
}
#dc-list .active {
  background: #d0d0ff;
}
</style>
