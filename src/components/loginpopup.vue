<template>
  <div id="popup-block" v-if="this.$store.state.auth.status !== 'Authenticated'">
    <div id="login-popup">
      <form @submit.prevent = "doLogin">
        <div>
          <select v-model = "authParams.race_id">
            <option disabled value = "">
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
          <label
            for = "username"
            @click = "$refs.username.focus()"
          >
            Username:
          </label>
          <input
            id = "username"
            ref = "username"
            v-model = "authParams.username"
          >
        </div>
        <div>
          <label
            for = "password"
            @click = "$refs.password.focus()"
          >
            Password:
          </label>
          <input
            id = "password"
            ref = "password"
            v-model = "authParams.password"
            type = "password"
          >
        </div>
        <div>
          <button
            type = "submit"
            :disabled = "!canSend"
          >
            Login
          </button>
        </div>
      </form>
      <div v-if="this.$store.state.auth.status !== 'Unauthenticated'">
        {{ this.$store.state.auth.status }}
      </div>
    </div>
  </div>
</template>

<script>
import { SkipThenError } from '../lib/solapi.js';

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
      retryTimeout: null,
    };
  },
  computed: {
    authenticated() {
      return this.$store.state.auth.token !== null;
    },
    canSend () {
      return (this.authParams.race_id !== '') &&
             (this.authParams.username.trim().length > 0) &&
             (this.authParams.password.trim().length > 0);
    },
  },
  created() {
    this.fetchRaces();
  },
  beforeDestroy () {
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  },

  methods: {
    fetchRaces () {
      this.retryTimeout = null;

      const getDef = {
        url: '/webclient/races.xml',
        params: {
          filter: 'active',
        },
        useArrays: false,
        dataField: 'races',
      };

      this.$store.dispatch('solapi/get', getDef, {root: true})
      .catch(() => {
        throw new SkipThenError();
      })
      .then(races => {
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
      })
      .catch((err) => {
        if (err instanceof SkipThenError) {
          this.retryTimeout = setTimeout(this.fetchRaces.bind(this), 3000);
        } else {
          console.log(err);
        }
      });
    },
    doLogin: function() {
      if (!this.canSend) {
        return;
      }
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
