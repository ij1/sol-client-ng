<template>
  <div id="app">
    <login-popup/>
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
      <control-panel/>
    </div>
  </div>
</template>

<script>
import StatusBar from './components/StatusBar.vue'
import LoginPopup from './components/LoginPopup.vue'
import Map from './components/Map.vue'
import BoatInstruments from './components/BoatInstruments.vue'
import WeatherPanel from './components/WeatherPanel.vue'
import LogMessages from './components/LogMessages.vue'
import ControlPanel from './components/ControlPanel.vue'

export default {
  name: 'app',
  components: {
    'status-bar': StatusBar,
    'login-popup': LoginPopup,
    'map-view': Map,
    'boat-instruments': BoatInstruments,
    'weather-panel': WeatherPanel,
    'log-messages': LogMessages,
    'control-panel': ControlPanel,
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
