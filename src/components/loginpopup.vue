<template>
  <div id="popup-block" v-if="authStatus !== 'Authenticated'">
    <popup-window
      title = "Login"
      :z-index = "1020"
      :close-button-label = "null"
      submit-button-label = "Login"
      @submit = "doLogin"
      :can-submit = "canSend"
      :auto-completion = "true"
    >
      <div>
        <select
          id = "race-selector"
          v-model = "authParams.race_id"
        >
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
        />
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
        />
      </div>
      <div v-if="authStatus !== 'Unauthenticated'">
        {{ authStatus }}
      </div>
    </popup-window>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import PopupWindow from './popupwindow.vue';

export default {
  name: 'Login',
  components: {
    'popup-window': PopupWindow,
  },
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
      return this.token !== null;
    },
    canSend () {
      return (this.authParams.race_id !== '') &&
             (this.authParams.username.trim().length > 0) &&
             (this.authParams.password.trim().length > 0);
    },
    ...mapState({
      standalone: state => state.auth.standalone,
      authStatus: state => state.auth.status,
      token: state => state.auth.token,
    }),
  },
  created() {
    /* Detect injected login credentials */
    if (!this.standalone) {
      this.$store.commit('auth/loggedIn', {
        token: window.token,
        race_id: window.theracenumber,
      });
      this.$store.dispatch('race/fetchRaceinfo');
    } else {
      this.fetchRaces();
    }
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
        apiCall: 'races',
        url: '/webclient/races.xml',
        params: {
          filter: 'active',
        },
        useArrays: false,
        dataField: 'races',
      };

      this.$store.dispatch('solapi/get', getDef, {root: true})
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
      .catch(err => {
        this.$store.commit('solapi/logError', {
          request: getDef,
          error: err,
        }, {root: true});
        setTimeout(() => {this.fetchRaces()}, 2000);
      });
    },
    doLogin: function() {
      if (!this.canSend) {
        return;
      }
      this.$store.dispatch('auth/login', this.authParams);
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
#race-selector {
  width: 400px;
}
</style>
