<template>
  <l-layer-group>
    <l-marker
      v-for = "offset in wrapList"
      :key = "poi.id + '_' + offset"
      :lat-lng = "latLngAddOffset(poi.latLng, offset)"
      :options = "poiOptions"
    >
      <l-icon
        icon-url = "images/poi-icon.png">
      </l-icon>
      <l-popup :options="popupOptions">
        <poi-info :poi = "poi"/>
        <form @submit.prevent = "onDelete">
          <button type="submit">Delete</button>
        </form>
      </l-popup>
    </l-marker>
  </l-layer-group>
</template>

<script>
import { LLayerGroup, LMarker, LIcon, LPopup } from 'vue2-leaflet';
import PoiInfo from './poiinfo.vue';
import { latLngAddOffset } from '../../../lib/utils.js';

export default {
  name: 'MapPoi',
  components: {
    'l-layer-group': LLayerGroup,
    'l-marker': LMarker,
    'l-icon': LIcon,
    'l-popup': LPopup,
    'poi-info': PoiInfo,
  },
  props: {
    poi: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      poiOptions: {
        bubblingMouseEvents: true,
      },
      popupOptions: {
        maxWidth: 350,
        autoClose: false,
        closeOnClick: false,
      },
      wrapList: [-360, 0, 360],
    }
  },
  methods: {
    onDelete () {
      this.$store.commit('ui/poi/delPoi', this.poi.id);
    },
    latLngAddOffset,
  },
}
</script>
