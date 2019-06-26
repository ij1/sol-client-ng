<template>
  <popup-window
    title = "Edit Configuration"
    :z-index = 1015
    close-button-label = "Cancel"
    @close = "onCancel"
    submit-button-label = "Change"
    @submit = "onSubmit"
    :can-submit = "canSubmit"
    v-if = "$store.state.ui.config.showEditor"
  >
    <template v-slot:extrabuttons>
      <button
        type = "reset"
        @click.prevent = "resetToDefaults"
      >
        Reset to defaults
      </button>
    </template>
    <div
      v-for = "(cfggroup, gindex) in configTree"
      :key = "'g' + gindex"
      id = "config-content"
    >
      <div class = "config-header">{{cfggroup.title}}</div>
      <div
        v-for = "cfg in cfggroup.cfgs"
        :key = "cfg.idx"
      >
        <config-boolean
          v-if = "cfg.cfgObj.type === 'boolean'"
          :cfg = "cfg.cfgObj"
          :value.sync = "config[cfg.idx]"
        />
        <config-range
          v-if = "cfg.cfgObj.type === 'range'"
          :cfg = "cfg.cfgObj"
          :value.sync = "config[cfg.idx]"
        />
        <config-values
          v-if = "cfg.cfgObj.type === 'values'"
          :cfg = "cfg.cfgObj"
          :value.sync = "config[cfg.idx]"
        />
      </div>
    </div>
  </popup-window>
</template>

<script>
import PopupWindow from '../popupwindow.vue';
import ConfigBoolean from './configboolean.vue';
import ConfigRange from './configrange.vue';
import ConfigValues from './configvalues.vue';

export default {
  name: 'ConfigEditor',
  components: {
    'popup-window': PopupWindow,
    'config-boolean': ConfigBoolean,
    'config-range': ConfigRange,
    'config-values': ConfigValues,
  },
  data () {
    return {
      configTree: [],
      default: [],
      config: [],
      committed: [],
    }
  },
  computed: {
    canSubmit () {
      return true;
    },
    configDef () {
      return [
        {
          title: 'General',
          cfgs: [{
            base: 'ui',
          },
          {
            base: 'map',
          }],
        },
        {
          title: 'Weather',
          cfgs: [{
            base: 'weather',
          }],
        },
        {
          title: 'Steering',
          cfgs: [{
            base: 'boat/steering',
          }],
        },
        {
          title: 'Instruments',
          cfgs: [{
            base: 'boat/instruments',
          }],
        },
        {
          title: 'Enable Instruments',
          cfgs: [{
            base: 'boat/instruments',
            multi: [
              'lat.enabled',
              'lon.enabled',
              'vmc.enabled',
              'date.enabled',
            ],
          }],
        },
      ];
    },
    configList () {
      let res = [];
      for (const i of this.configTree) {
        res = res.concat(i.cfgs);
      }
      return res;
    },
  },

  created () {
    this.createConfigTree();
    let def = [];
    let config = [];
    let committed = [];

    for (const cfg of this.configList) {
      let origValue = this.getStoreObj(cfg.base, cfg.path).value;
      def[cfg.idx] = origValue;
      config[cfg.idx] = def[cfg.idx];
      const storedValue = localStorage.getItem(this.localStorageKey(cfg));
      if (storedValue !== null) {
        /* Matches type to target's */
        config[cfg.idx] = (origValue.constructor)(storedValue);
      }
      committed[cfg.idx] = config[cfg.idx];
    }
    this.default = def;
    this.config = config;
    this.committed = committed;
    this.updateStore();
    this.$store.commit('ui/configLoaded');
  },
  methods: {
    onClose () {
      this.$store.commit('ui/closeConfigEditor');
    },
    onCancel () {
      this.copyConfig('committed', 'config');
      this.onClose();
    },
    onSubmit () {
      this.copyConfig('config', 'committed');
      this.updateLocalstorage();
      this.onClose();
    },
    resetToDefaults () {
      this.copyConfig('default', 'config');
    },
    copyConfig (from, to) {
      let arr = [].concat(this[to]);
      for (const cfg of this.configList) {
        arr[cfg.idx] = this[from][cfg.idx];
      }
      this[to] = arr;
    },
    updateLocalstorage () {
      for (const cfg of this.configList) {
        if (this.config[cfg.idx] !== this.default[cfg.idx]) {
          localStorage.setItem(this.localStorageKey(cfg), this.config[cfg.idx]);
        } else {
          localStorage.removeItem(this.localStorageKey(cfg));
        }
      }
    },
    updateStore () {
      for (const cfg of this.configList) {
        this.$store.commit(cfg.base + '/configSetValue', {
          path: this.getRelativePath(cfg.path),
          value: this.config[cfg.idx],
        });
      }
    },
    getRelativePath (path) {
      return path.split('.');
    },
    getStoreObj (base, cfgPath) {
      let obj = this.$store.state;
      for (const i of base.split('/')) {
        obj = obj[i];
      }
      for (const i of this.getRelativePath(cfgPath)) {
        obj = obj[i];
      }
      return obj;
    },
    createConfigTree () {
      let groups = [];
      let cfgIdx = 0;
      for (let cfggroup of this.configDef) {
        let cfgs = [];

        for (const cfg of cfggroup.cfgs) {
          if (typeof cfg.multi !== 'undefined') {
            for (let key of cfg.multi) {
              cfgs.push({
                base: cfg.base,
                path: key,
                cfgObj: this.getStoreObj(cfg.base, key),
                idx: cfgIdx++,
              });
            }
          } else {
            let storeObj = this.getStoreObj(cfg.base, 'cfg');
            for (let key of Object.keys(storeObj)) {
              const relPath = 'cfg.' + key;
              cfgs.push({
                base: cfg.base,
                path: relPath,
                cfgObj: this.getStoreObj(cfg.base, relPath),
                idx: cfgIdx++,
              });
            }
          }
        }
        groups.push({ title: cfggroup.title, cfgs: cfgs });
      }
      this.configTree = groups;
    },
    localStorageKey(cfg) {
      return 'sol-cfg:' + cfg.base + ':' + cfg.path
    },
  },
  watch: {
    config () {
      this.updateStore();
    },
  },
}
</script>

<style scoped>
#config-content {
  font-size: 10px;
  text-align: left;
}
.config-header {
  font-size: 11px;
  font-weight: bold;
}
</style>
