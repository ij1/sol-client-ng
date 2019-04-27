import boatlistsModule from './boatlists.js';

export default {
  namespaced: true,

  modules: {
    boatlists: boatlistsModule,
  },

  state: {
    activeTab: 0,
    alert: [false, false, false, false, false, false],
    config: {
      showEditor: false,
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
  },
}
