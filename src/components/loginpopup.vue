<template>
  <div id="popup-block" v-if="this.$store.state.auth.status !== 'Authenticated'">
    <div id="login-popup">
      <div>
        Username:
        <input v-model="authParams.username">
      </div>
      <div>
        Password:
        <input v-model="authParams.password" type="password">
      </div>
      <div>
        <select v-model="authParams.race_id">
          <option disabled value="">
            {{ raceSelectorInfo }}
          </option>
          <option
            v-for = "race in raceData"
            v-bind:value = "race.id"
            v-bind:key = "race.id"
          >
            {{ race.name }}
          </option>
        </select>
      </div>
      <div>
        <button
          v-on:click = "doLogin"
          :disabled = "authParams.race_id === ''"
        >
          Login
        </button>
      </div>
      <div v-if="this.$store.state.auth.status !== 'Unauthenticated'">
        {{ this.$store.state.auth.status }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data () {
    return {
      authParams: {
        username: '',
        password: '',
        race_id: '',
      },
      raceData: null,
      raceSelectorInfo: 'Still loading races...',
    }
  },
  computed: {
    authenticated() {
      return this.$store.state.auth.token !== null;
    }
  },
  mounted() {
    const getDef = {
      url: '/webclient/races.xml',
      params: {
        filter: 'active',
      },
      useArrays: false,
      dataField: 'races',
      dataHandler: (races) => {
        if (typeof races.race === 'undefined') {
          this.raceSelectorInfo = 'No active races at the moment';
          return;
        }
        if (!Array.isArray(races.race)) {
          this.raceData = [ races.race ];
        } else {
          this.raceData = races.race;
        }
        this.raceSelectorInfo = 'Please select the race';
      },
    }
    this.$store.dispatch('solapi/get', getDef, {root: true});
  },

  methods: {
    doLogin: function() {
      this.$store.dispatch('auth/login', this.authParams)
    }
  }
}
</script>

<style scoped>
#popup-block {
  position: fixed;
  min-width: 100%;
  min-height: 100%;
  background: #e0e0e0c0;
  z-index: 100;
}
#login-popup {
  position: absolute;
  left: 50%;
  top: 50%;
  margin-right: -50%;
  min-width: 500px;
  transform: translate(-50%, -50%);
  padding: 10px;
  border: solid 3px;
  border-radius: 10px;
  border-color: #808080;
  background: #fff;
  text-align: left;
  z-index: 1002;
}

</style>
