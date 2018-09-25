import Vue from 'vue'
import Vuex from 'vuex'
import configModule from './modules/config'
import authModule from './modules/auth'
import solapiModule from './modules/solapi'
import boatModule from './modules/boat'
import raceModule from './modules/race'
import chatroomsModule from './modules/chatrooms'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    config: configModule,
    auth: authModule,
    solapi: solapiModule,
    boat: boatModule,
    race: raceModule,
    chatrooms: chatroomsModule,
  },
  strict: true,
})
