<template>
  <l-layer-group>
    <l-polygon
      v-for = "isochrone in isochrones"
      :key = "isochrone.id"
      :lat-lngs = "isochrone.line"
      :color = "isochrone.color"
      :weight = "1"
      :fill = "false"
    />
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup, LPolygon } from 'vue2-leaflet';

export default {
  name: 'MapIsochrones',
  components: {
    'l-layer-group': LLayerGroup,
    'l-polygon': LPolygon,
  },
  computed: {
    ...mapState({
      isochrones: state => state.ui.tools.isochrones,
    }),
  },
}
</script>