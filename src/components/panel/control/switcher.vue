<template>
  <div id="control-panel">
    <div class="tabs">
      <a v-on:click="activeTab=0" v-bind:class="activeTab === 0 ? 'active' : ''">Steer</a>
      <a v-on:click="activeTab=1" v-bind:class="activeTab === 1 ? 'active' : ''">DCs</a>
      <a v-on:click="activeTab=2" v-bind:class="activeTab === 2 ? 'active' : ''">LB</a>
      <a v-on:click="activeTab=3" v-bind:class="activeTab === 3 ? 'active' : ''">Chat</a>
      <a v-on:click="activeTab=4" v-bind:class="activeTab === 4 ? 'active' : ''">NOR</a>
      <a v-on:click="activeTab=5" v-bind:class="activeTab === 5 ? 'active' : ''">Help</a>
    </div>
    <div>
      <div v-if="activeTab === 0" class="control-panel-content">
        <control-steering/>
      </div>
      <div v-if="activeTab === 1" class="control-panel-content">
        <control-dcs/>
      </div>
      <div v-if="activeTab === 2" class="control-panel-content">
        <control-leaderboard/>
      </div>
      <div v-if="activeTab === 3" class="control-panel-content">
        <control-chats/>
      </div>
      <div v-if="activeTab === 4" class="control-panel-content">
        <control-race-messages/>
      </div>
    </div>
  </div>
</template>

<script>
import ControlSteering from './steering.vue';
import ControlDCs from './dcs.vue';
import ControlLeaderboard from './leaderboard.vue';
import ControlChats from './chats.vue';
import ControlRaceMessages from './racemessages.vue';

export default {
  name: 'ControlPanel',
  components: {
    'control-steering': ControlSteering,
    'control-dcs': ControlDCs,
    'control-leaderboard': ControlLeaderboard,
    'control-chats': ControlChats,
    'control-race-messages': ControlRaceMessages,
  },
  data () {
    return {
      activeTab: 1,
    }
  },
}
</script>

<style scoped>
#control-panel {
  position: absolute;
  top: 0;
  min-height: 100%;
  width: 100%;
  overflow: hidden;
}

.tabs {
  margin-left: 10px;
  margin-bottom: -2px;
  overflow: hidden;
}

.tabs a {
  float: left;
  padding: 5px 5px;
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
}

.control-panel-content {
  overflow: hidden;
  padding: 5px;
  border: 1px solid #c0c0c0;
  border-radius: 10px;
}
</style>