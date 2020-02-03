import Vue from 'vue';
import PortalVue from 'portal-vue';
import App from './App.vue';
import { store } from './store';
import { leafletIconQuirk } from './lib/quirks.js';

leafletIconQuirk();

Vue.config.productionTip = false;
//Vue.config.performance = true;

Vue.use(PortalVue);

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')
