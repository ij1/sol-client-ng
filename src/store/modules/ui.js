import boatlistsModule from './boatlists.js';
import poiModule from './poi.js';
import rulerModule from './ruler.js';
import { configSetValue } from '../../components/config/configstore.js';

export default {
  namespaced: true,

  modules: {
    boatlists: boatlistsModule,
    poi: poiModule,
    ruler: rulerModule,
  },

  state: {
    activeTab: 0,
    alert: [false, false, false, false, false, false],
    uiModeCancel: null,
    config: {
      loaded: false,
      showEditor: false,
    },
    showHelp: false,
    showTools: false,
    uiComponent: Object.assign(
      {
        controlPanel: true,
        steeringPanel: true,
        dcPanel: true,
        rankingPanel: true,
        chatPanel: true,
        racemessagePanel: true,
        miscPanel: true,
        bottomPanels: true,
        instrumentPanel: true,
        statusBar: true,
        dcBar: true,
      },
      (typeof window.uicomponents !== 'undefined' ?
       window.uicomponents : {})
    ),
    cfg: {
      gcMode: {
        value: true,
        type: 'boolean',
        cfgText: 'Use great-circle distance',
      },
      coordinateFormat: {
        value: 'degmin',
        values: [
          ['degmin', "DD\xb0MM.mmm'H"],
          ['deg', 'DD.ddddd\xb0H'],
          ['signdeg', '+/-DD.ddddd\xb0'],
          ['signdegnosym', '+/-DD.ddddd'],
        ],
        type: 'values',
        cfgText: 'Lat/Lon format',
      },
      cursorLines: {
        value: 'scale',
        values: [
          ['none', "None"],
          ['scale', "10m scale only"],
          ['normal', "Horizontal and vertical"],
          ['wind', "Wind based"],
        ],
        type: 'values',
        cfgText: 'Auxiliary cursor lines',
      },
      dayNightMode: {
        value: 'default',
        values: [
          ['default', 'Default'],
          ['day', 'Daylight only'],
          ['white', 'White, no terminator'],
          ['dark', 'Dark only'],
        ],
        type: 'values',
        cfgText: 'Day/night mode',
      },
      nightIcons: {
        value: 'default',
        values: [
          ['default', 'Default'],
          ['hull', 'Show only hull'],
        ],
        type: 'values',
        cfgText: 'Boat icons at night',
      },
      groundAlertSound: {
        value: false,
        type: 'boolean',
        cfgText: 'Grounding alert sound',
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
    setUiModeCancel(state, cancelMutation) {
      state.uiModeCancel = cancelMutation;
    },
    showConfigEditor(state) {
      state.config.showEditor = true;
    },
    closeConfigEditor(state) {
      state.config.showEditor = false;
    },
    showQuickHelp(state) {
      state.showHelp = true;
    },
    closeQuickHelp(state) {
      state.showHelp = false;
    },
    showTools(state) {
      state.showTools = true;
    },
    closeTools(state) {
      state.showTools = false;
    },
    configLoaded(state) {
      state.config.loaded = true;
    },
    configSetValue,
  },
  getters: {
    inDefaultUiMode: (state) => {
      return state.uiModeCancel === null;
    },
    currentDayNight: (state, getters, rootState, rootGetters) => {
      if (state.cfg.dayNightMode.value === 'default') {
        const boatInDark = rootGetters['boat/inDark'];
        return boatInDark ? 'dark' : 'white';
      }
      if (state.cfg.dayNightMode.value === 'dark') {
        return 'dark';
      }
      return 'white';
    },
    isDark: (state, getters) => {
      return getters['currentDayNight'] === 'dark';
    },
    allowNavLights: (state, getters, rootState) => {
      return rootState.ui.cfg.nightIcons.value !== 'hull';
    },
    currentTarget: (state, getters, rootState, rootGetters) => {
      const poiTgt = rootGetters['ui/poi/target'];
      return poiTgt === null ? rootGetters['race/nextWaypoint'] : poiTgt;
    },
  },
  actions: {
    setUiMode({state, commit}, uiMode) {
      /* Change the mode, clear the previous mode before setting new */
      if (state.uiModeCancel !== uiMode.cancel) {
        if (state.uiModeCancel !== null) {
          commit(state.uiModeCancel, null, {root: true});
        }
        commit('setUiModeCancel', uiMode.cancel);
      }
      /* Cancelling asked, remove cancel then too */
      if (state.uiModeCancel === uiMode.newMode) {
        commit('setUiModeCancel', null);
      }
      commit(uiMode.newMode, uiMode.param, {root: true});
    },
    cancelUiMode({state, commit}) {
      if (state.uiModeCancel !== null) {
        commit(state.uiModeCancel, null, {root: true});
      }
      commit('setUiModeCancel', null);
    }
  },
}
