<template>
  <l-layer-group>
    <l-marker :lat-lng = "poi.latLng">
      <l-icon
        icon-url = "images/poi-icon.png">
      </l-icon>
      <l-popup>
        <map-coordinate :lat-lng = "poi.latLng"/>
        <form @submit.prevent = "onDelete">
          <button type="submit">Delete</button>
        </form>
      </l-popup>
    </l-marker>
  </l-layer-group>
</template>

<script>
import { LLayerGroup, LMarker, LIcon, LPopup } from 'vue2-leaflet';
import MapCoordinate from '../../coordinate.vue';

export default {
  name: 'MapPoi',
  components: {
    'l-layer-group': LLayerGroup,
    'l-marker': LMarker,
    'l-icon': LIcon,
    'l-popup': LPopup,
    'map-coordinate': MapCoordinate,
  },
  props: {
    poi: {
      type: Object,
      required: true,
    },
  },
  methods: {
    onDelete () {
      this.$store.commit('ui/poi/delPoi', this.poi.id);
    },
  },
}
</script>
