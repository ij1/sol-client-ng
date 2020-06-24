<template>
  <popup-window
    class = "config-editor"
    title = "Edit Configuration"
    :z-index = 1015
    close-button-label = "Cancel"
    @close = "onCancel"
    submit-button-label = "Save"
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
    <div>
      <div
        v-for = "(cfggroup, gindex) in configTree"
        :key = "'g' + gindex"
        class = "config-content"
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
          <config-color
            v-if = "cfg.cfgObj.type === 'color'"
            :cfg = "cfg.cfgObj"
            :value.sync = "config[cfg.idx]"
          />
        </div>
      </div>
      <button @click.prevent = "onClear">Clear Local Storage</button>
    </div>
  </popup-window>
</template>

<script>
import PopupWindow from '../popupwindow.vue';
import ConfigBoolean from './configboolean.vue';
import { configParseBoolean } from './configboolean.vue';
import ConfigRange from './configrange.vue';
import { configParseRange } from './configrange.vue';
import ConfigValues from './configvalues.vue';
import { configParseValues } from './configvalues.vue';
import ConfigColor from './configcolor.vue';
import { configParseColor } from './configcolor.vue';

export default {
  name: 'ConfigEditor',
  components: {
    'popup-window': PopupWindow,
    'config-boolean': ConfigBoolean,
    'config-range': ConfigRange,
    'config-values': ConfigValues,
    'config-color': ConfigColor,
  },
  data () {
    return {
      default: [],
      config: [],
      committed: [],
      parser: {
        boolean: configParseBoolean,
        range: configParseRange,
        values: configParseValues,
        color: configParseColor,
      }
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
        {
          title: 'Workarounds and Diagnostics',
          cfgs: [{
            base: 'diagnostics',
          }],
        },
      ];
    },
    configTree () {
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
      return groups;
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
    let def = [];
    let config = [];
    let committed = [];

    for (const cfg of this.configList) {
      let origValue = this.getStoreObj(cfg.base, cfg.path).value;
      def[cfg.idx] = origValue;
      config[cfg.idx] = def[cfg.idx];
      const storedValue = localStorage.getItem(this.localStorageKey(cfg));
      if (storedValue !== null) {
        const parsedVal = this.parser[cfg.cfgObj.type](storedValue, cfg.cfgObj);
        if (parsedVal !== null) {
          config[cfg.idx] = parsedVal;
        }
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
    localStorageKey(cfg) {
      return 'sol-cfg:' + cfg.base + ':' + cfg.path;
    },
    onClear () {
      this.resetToDefaults();
      let clearlist = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('sol-')) {
          clearlist.push(key);
        }
      }
      try {
        for (const key of clearlist) {
          localStorage.removeItem(key);
        }
      } catch(err) {
        // NOP
      }
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
.config-editor {
  width: 470px;
}
.config-content {
  font-size: 12px;
  text-align: left;
}
.config-header {
  font-size: 14px;
  font-weight: bold;
}
</style>
