<template>
  <div id="app">
    <login-popup/>
    <errors-popup/>
    <notifications-popup/>
    <config-editor/>
    <race-messages-popup/>
    <quick-help-popup/>
    <tools-popup/>
    <portal-target name="dc-editor-dest"/>
    <portal-target name="boatlist-editor-dest"/>
    <main-view/>
    <weather-sound/>
    <ground-alert-sound/>
  </div>
</template>

<script>
import LoginPopup from './components/loginpopup.vue';
import ErrorsPopup from './components/errorspopup.vue';
import NotificationsPopup from './components/notificationspopup.vue';
import ConfigEditor from './components/config/configeditor.vue';
import RaceMessagesPopup from './components/racemessagespopup.vue';
import QuickHelpPopup from './components/quickhelppopup.vue';
import ToolsPopup from './components/tools/toolspopup.vue';
import MainView from './components/mainview.vue';
import WeatherSound from './components/weathersound.vue';
import GroundAlertSound from './components/groundalertsound.vue';

export default {
  name: 'app',
  components: {
    'login-popup': LoginPopup,
    'errors-popup': ErrorsPopup,
    'notifications-popup': NotificationsPopup,
    'config-editor': ConfigEditor,
    'race-messages-popup': RaceMessagesPopup,
    'quick-help-popup': QuickHelpPopup,
    'tools-popup': ToolsPopup,
    'main-view': MainView,
    'weather-sound': WeatherSound,
    'ground-alert-sound': GroundAlertSound,
  },
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
