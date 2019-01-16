import Vue from 'vue'
import PortalVue from 'portal-vue'
import App from './App.vue'
import store from './store'

Vue.config.productionTip = false

Vue.use(PortalVue);

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')
