<template>
  <div id="control-panel">
    <div class="tabs">
      <a @click="activeTab=0" :class="activeTab === 0 ? 'active' : ''">
        <img src="../../../images/wheel.png" alt="Steering"/>
      </a>
      <a @click="activeTab=1" :class="activeTab === 1 ? 'active' : ''">
        <img src="../../../images/clock.png" alt="Delayed Commands"/>
      </a>
      <a @click="activeTab=2" :class="activeTab === 2 ? 'active' : ''">
        <img src="../../../images/podium.png" alt="Boatlists"/>
      </a>
      <a @click="activeTab=3" :class="activeTab === 3 ? 'active' : ''">
        <img src="../../../images/chat.png" alt="Chat"/>
      </a>
      <a
        v-if = "racemessages.length > 0"
        @click = "activeTab=4"
        :class="activeTab === 4 ? 'active' : ''"
      >
        <lima-flag :size = "14"/>
      </a>
      <a @click="activeTab=6" :class="activeTab === 6 ? 'active' : ''">Misc</a>
      <a
        v-if = "configShowDiagnostics"
        @click = "activeTab=7"
        :class="activeTab === 7 ? 'active' : ''"
      >Diag</a>
    </div>
    <div>
      <div v-if="activeTab === 0" class="control-panel-content">
        <control-steering/>
      </div>
      <div v-if="activeTab === 1" class="control-panel-content">
        <keep-alive>
          <control-dcs/>
        </keep-alive>
      </div>
      <div v-if="activeTab === 2" class="control-panel-content">
        <keep-alive>
          <control-leaderboards/>
        </keep-alive>
      </div>
      <div v-if="activeTab === 3" class="control-panel-content">
        <control-chats/>
      </div>
      <div v-if="activeTab === 4" class="control-panel-content">
        <keep-alive>
          <control-race-messages/>
        </keep-alive>
      </div>
      <div v-if="activeTab === 6" class="control-panel-content">
        <control-misc/>
      </div>
      <div v-if="activeTab === 7" class="control-panel-content">
        <control-diagnostics/>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ControlSteering from './steering.vue';
import ControlDCs from './dcs.vue';
import ControlLeaderboards from './leaderboards.vue';
import ControlChats from './chats.vue';
import ControlRaceMessages from './racemessages.vue';
import ControlMisc from './misc.vue';
import ControlDiagnostics from './diagnostics.vue';
import LimaFlag from '../../limaflag.vue';

export default {
  name: 'ControlPanel',
  components: {
    'control-steering': ControlSteering,
    'control-dcs': ControlDCs,
    'control-leaderboards': ControlLeaderboards,
    'control-chats': ControlChats,
    'control-race-messages': ControlRaceMessages,
    'control-misc': ControlMisc,
    'control-diagnostics': ControlDiagnostics,
    'lima-flag': LimaFlag,
  },
  computed: {
    activeTab: {
      get () {
        return this.$store.state.ui.activeTab;
      },
      set (value) {
        this.$store.commit('ui/setActiveTab', value);
      }
    },
    ...mapState({
      configShowDiagnostics: state => state.diagnostics.cfg.showDiagnostics.value,
      racemessages: state => state.race.messages.racemsgs,
    }),
  },
}
</script>

<style scoped>
#control-panel {
  position: relative;
  top: 0;
  min-height: 100%;
  width: 100%;
  overflow: hidden;
}

.tabs {
  display: flex;
  margin-left: 10px;
  margin-bottom: -1px;
  overflow: hidden;
  font-size: 11px;
}

.tabs a {
  padding-top: 5px;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 2px;
  border: 1px solid #c0c0c0;
  border-right: none;
  border-radius: 10px 10px 0 0;
  background-color: #f0f0f0;
}

.tabs a:last-child {
  border-right: 1px solid #c0c0c0;
}

.tabs a.active {
  background-color: #ffffff;
  border-bottom: 2px solid #ffffff;
  z-index: 1;
}

.control-panel-content {
  position: relative;
  overflow: hidden;
  padding: 5px;
  border: 1px solid #c0c0c0;
  border-radius: 10px;
  height: calc(100vh - 32px - 10px);
}
</style>
