<template>
  <splitpanes
    class = "default-theme"
    @resize = "doResize"
    @resized = "doResize"
  >
    <div id = "left-div" splitpanes-size = "80">
      <map-panel/>
    </div>
    <div id = "right-div" splitpanes-size = "20">
      <control-panel-switcher/>
    </div>
  </splitpanes>
</template>

<script>
import { EventBus } from '../lib/event-bus.js';

import Splitpanes from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import MapPanel from './mappanel.vue';
import ControlPanelSwitcher from './panel/control/switcher.vue';

export default {
  name: 'MainView',
  components: {
    'splitpanes': Splitpanes,
    'map-panel': MapPanel,
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
.splitpanes--vertical > .splitpanes__splitter {
  min-width: 9px;
}

.splitpanes--vertical > .splitpanes__splitter:after,
.splitpanes--vertical > .splitpanes__splitter:before {
  background-color: rgba(0, 0, 0, 0.3) !important;
}

.splitpanes--vertical > .splitpanes__splitter:hover:after,
.splitpanes--vertical > .splitpanes__splitter:hover:before {
  background-color: rgba(0, 0, 0, 0.5) !important;
}

</style>

<style scoped>
#left-div {
  position: absolute;
  top: 0;
  left: 0;
  width: inherit;
  height: 100%;
  overflow: hidden;
}
#right-div {
  position: absolute;
  top: 0;
  right: 0;
  width: inherit;
  height: 100%;
  overflow: hidden;
  background-color: #fff;
}
</style>
