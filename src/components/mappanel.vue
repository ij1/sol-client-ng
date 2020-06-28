<template>
  <div>
    <map-view ref="map"/>
    <bottom-panel/>
  </div>
</template>

<script>
import Map from './map/map.vue';
import BottomPanel from './panel/bottompanel.vue';

export default {
  name: 'MapPanel',
  components: {
    'map-view': Map,
    'bottom-panel': BottomPanel,
  },
}
</script>
