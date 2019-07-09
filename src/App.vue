<template>
  <div id="app">
    <login-popup/>
    <notifications-popup/>
    <config-editor/>
    <race-messages-popup/>
    <portal-target name="dc-editor-dest"/>
    <portal-target name="boatlist-editor-dest"/>
    <splitpanes
      class = "default-theme"
      @resize = "doResize"
      @resized = "doResize"
    >
      <div id = "left-div" splitpanes-size = "80">
        <map-view ref="map"/>
        <weather-panel/>
        <boat-instruments/>
      </div>
      <div id = "right-div" splitpanes-size = "20">
        <control-panel-switcher/>
      </div>
    </splitpanes>
  </div>
</template>

<script>
import { EventBus } from './lib/event-bus.js';

import Splitpanes from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import LoginPopup from './components/loginpopup.vue';
import NotificationsPopup from './components/notificationspopup.vue';
import ConfigEditor from './components/config/configeditor.vue';
import RaceMessagesPopup from './components/racemessagespopup.vue';
import Map from './components/map/map.vue';
import BoatInstruments from './components/panel/instruments/instruments.vue';
import WeatherPanel from './components/panel/weatherwrapper.vue';
import ControlPanelSwitcher from './components/panel/control/switcher.vue';

export default {
  name: 'app',
  components: {
    'splitpanes': Splitpanes,
    'login-popup': LoginPopup,
    'notifications-popup': NotificationsPopup,
    'config-editor': ConfigEditor,
    'race-messages-popup': RaceMessagesPopup,
    'map-view': Map,
    'boat-instruments': BoatInstruments,
    'weather-panel': WeatherPanel,
    'control-panel-switcher': ControlPanelSwitcher,
  },
  methods: {
    doResize () {
      EventBus.$emit('right-pane-resize');
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

html, body {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 100%;
  max-height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

</style>

<style scoped>
#left-div {
  position: absolute;
  top: 0;
  left: 0;
  width: inherit;
  height: inherit;
  overflow: hidden;
}
#right-div {
  position: absolute;
  top: 0;
  right: 0;
  width: inherit;
  height: inherit;
  overflow: hidden;
  background-color: #fff;
}
</style>
