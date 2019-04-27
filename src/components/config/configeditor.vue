<template>
  <popup-window
    title = "Edit Configuration"
    :z-index = 1015
    close-button-label = "Cancel"
    @close = "onClose"
    submit-button-label = "Change"
    @submit = "onSubmit"
    :can-submit = "this.canSubmit"
    v-if = "$store.state.ui.config.showEditor"
  >
    <div
      v-for = "(cfggroup, gindex) in this.configTree"
      :key = "'g' + gindex"
    >
      <div>{{cfggroup.title}}</div>
      <div
        v-for = "cfg in cfggroup.cfgs"
        :key = "cfg.idx"
      >
        <label>{{cfg.cfgObj.cfgText}}</label>
        <input
          v-if = "cfg.cfgObj.type === 'boolean'"
          type = "checkbox"
          v-model = "config[cfg.idx]"
        />
      </div>
    </div>
  </popup-window>
</template>

<script>
import Vue from 'vue';
import PopupWindow from '../popupwindow.vue';

export default {
  name: 'ConfigEditor',
  components: {
    'popup-window': PopupWindow,
  },
  data () {
    return {
      configTree: [],
      default: [],
      config: [],
    }
  },
  computed: {
    canSubmit () {
      return true;
    },
    configDef () {
      return [
        {
          title: 'Weather',
          cfgs: {
            base: 'weather',
          },
        },
        {
          title: 'Steering',
          cfgs: {
            base: 'boat/steering',
          },
        },
        {
          title: 'Enable Instruments',
          cfgs: {
            base: 'boat/instruments',
            multi: [
              'lat.enabled',
              'lon.enabled',
              'vmc.enabled',
              'date.enabled',
            ],
          },
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
    for (const cfg of this.configList) {
      Vue.set(this.default, cfg.idx, this.getStoreObj(cfg.base, cfg.path).value);
      // ADDME: fetch from localstore, if available
      Vue.set(this.config,cfg.idx, this.default[cfg.idx]);
    }
  },
  methods: {
    onClose () {
      this.$store.commit('ui/closeConfigEditor');
    },
    onSubmit () {
      for (const cfg of this.configList) {
        this.$store.commit(cfg.base + '/configSetValue', {
          path: this.getRelativePath(cfg.path),
          value: this.config[cfg.idx],
        });
        // ADDME: store to localstore
      }
      this.onClose();
    },
    resetToDefaults () {
      for (const cfg of this.configList) {
        this.config[cfg.idx] = this.default[cfg.idx];
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

        const cfg = cfggroup.cfgs;
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
        groups.push({ title: cfggroup.title, cfgs: cfgs });
      }
      this.configTree = groups;
    },
  },
}
</script>
