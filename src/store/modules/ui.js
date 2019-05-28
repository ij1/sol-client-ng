import boatlistsModule from './boatlists.js';
import { configSetValue } from '../../components/config/configstore.js';

export default {
  namespaced: true,

  modules: {
    boatlists: boatlistsModule,
  },

  state: {
    activeTab: 0,
    alert: [false, false, false, false, false, false],
    config: {
      loaded: false,
      showEditor: false,
    },
    cfg: {
      gcMode: {
        value: true,
        type: 'boolean',
        cfgText: 'Use great-circle distance',
      },
    },
  },

  mutations: {
    setActiveTab(state, activeTab) {
      state.activeTab = activeTab;
      state.alert[activeTab] = false;
    },
    raiseAlert(state, alertTab) {
      if (state.activeTab !== alertTab) {
        state.alert[alertTab] = true;
      }
    },
    showConfigEditor(state) {
      state.config.showEditor = true;
    },
    closeConfigEditor(state) {
      state.config.showEditor = false;
    },
    configLoaded(state) {
      state.config.loaded = true;
    },
    configSetValue,
  },
}
