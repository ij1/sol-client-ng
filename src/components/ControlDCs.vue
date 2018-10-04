<template>
  <div id="dc-control">
    <div id="dc-header">
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
            <td>{{ command.time }}</td>
            <td>{{ command.type | cctocog }}</td>
            <td>{{ command.value | degrees }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ControlDCs',
  data () {
    return {
      loading: true,
      commands: null,
      selected: null,
    }
  },
  filters: {
    degrees (radians) {
      return (radians * 180 / Math.PI)
               .toFixed(2)
    },
    cctocog (type) {
      return type === 'cc' ? 'cog' : type;
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
      this.$store.dispatch('boat/steering/sendDeleteDC', {id: this.selected});
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
