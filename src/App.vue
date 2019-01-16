<template>
  <div id="app">
    <login-popup/>
    <notifications-popup/>
    <portal-target name="dc-editor-dest"/>
    <div id="left_div">
      <div id="left_top_div">
        <status-bar/>
      </div>
      <div id="left_main_div">
        <map-view/>
        <log-messages/>
        <weather-panel/>
        <boat-instruments/>
      </div>
    </div>
    <div id="right_div">
      <control-panel-switcher/>
    </div>
  </div>
</template>

<script>
import StatusBar from './components/statusbar.vue'
import LoginPopup from './components/loginpopup.vue'
import NotificationsPopup from './components/notificationspopup.vue';
import Map from './components/map/map.vue'
import BoatInstruments from './components/panel/instruments/instruments.vue'
import WeatherPanel from './components/panel/weather.vue'
import LogMessages from './components/logmessages.vue'
import ControlPanelSwitcher from './components/panel/control/switcher.vue'

export default {
  name: 'app',
  components: {
    'status-bar': StatusBar,
    'login-popup': LoginPopup,
    'notifications-popup': NotificationsPopup,
    'map-view': Map,
    'boat-instruments': BoatInstruments,
    'weather-panel': WeatherPanel,
    'log-messages': LogMessages,
    'control-panel-switcher': ControlPanelSwitcher,
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
#left_div {
  position: absolute;
  top: 0;
  left: 0;
  width: 80%;
  height: 100%;
  overflow: hidden;
}
#right_div {
  position: absolute;
  top: 0;
  right: 0;
  width: 20%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}
#left_div_top {
  position: absolute;
  top: 0;
  height: 20px;
}
#left_div_main {
  position: absolute;
  float: bottom;
  height: auto;
  width: 100%;
}
</style>
