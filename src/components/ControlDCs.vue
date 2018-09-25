<template>
  <div id="dc-control">
    <div id="dc-header">
      <button @click="doDelete">Delete</button>
      <button @click="doRefresh">Refresh</button>
    </div>
    <div id="dc-list">
      <table>
        <thead>
          <tr>
            <td>Time</td>
            <td>Type</td>
            <td>&deg;</td>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for = "command in this.$store.state.boat.dcs"
            v-bind:key = "command.id"
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
      this.$store.dispatch('boat/fetchDCs');
    },
    doDelete () {
      // ADDME
    },
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
#dc-list {
  float: bottom;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  font-size: 10px;
}
</style>
