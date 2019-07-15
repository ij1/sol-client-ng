<template>
  <l-layer-group>
    <map-poi
      v-for = "poi in pois"
      :key = "poi.id"
      :poi = "poi"
    />
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup } from 'vue2-leaflet';
import MapPoi from './poi.vue';

export default {
  name: 'MapPois',
  components: {
    'l-layer-group': LLayerGroup,
    'map-poi': MapPoi,
  },
  computed: {
    ...mapState({
      pois: state => state.ui.poi.pois,
    }),
  },
}
</script>
