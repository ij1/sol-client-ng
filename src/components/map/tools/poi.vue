<template>
  <l-layer-group>
    <l-layer-group
      v-for = "offset in wrapList"
      :key = "poi.id + '_' + offset"
    >
      <l-marker
        :lat-lng = "latLngAddOffset(poi.latLng, offset)"
        :options = "poiOptions"
        ref = "popupctrl"
      >
        <l-icon
          :icon-url = "iconUrl">
        </l-icon>
        <l-popup
          :options="popupOptions"
          @add = "onOpen"
          @remove = "onClose"
        >
          <poi-info :poi = "poi"/>
          <form @submit.prevent = "onButterfly">
            <button type="submit">{{butterflyButtonText}}</button>
          </form>
          <form @submit.prevent = "onDelete">
            <button type="submit">Delete</button>
          </form>
        </l-popup>
      </l-marker>
      <map-polar
        v-if = "poi.showButterfly && twd !== null"
        :lat-lng = "latLngAddOffset(poi.latLng, offset)"
        :twd = "twd"
      />
    </l-layer-group>
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup, LMarker, LIcon, LPopup } from 'vue2-leaflet';
import PoiInfo from './poiinfo.vue';
import MapPolar from '../mappolar.vue';
import { publicPath } from '../../../lib/sol.js';
import { latLngAddOffset } from '../../../lib/utils.js';

const iconUrl = publicPath + 'images/poi-icon.png';

export default {
  name: 'MapPoi',
  components: {
    'l-layer-group': LLayerGroup,
    'l-marker': LMarker,
    'l-icon': LIcon,
    'l-popup': LPopup,
    'poi-info': PoiInfo,
    'map-polar': MapPolar,
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
        maxWidth: 370,
        autoClose: false,
        closeOnClick: false,
        autoPan: false,
      },
      wrapList: [-360, 0, 360],
      iconUrl: iconUrl,
      recursionTrap: false,
    }
  },
  computed: {
    twd () {
      const wind = this.$store.getters['weather/latLngWind'](this.poi.latLng,
                                                             this.wxTime)
      if (wind === null) {
        return null;
      }
      return wind.twd;
    },
    butterflyButtonText () {
      return this.poi.showButterfly ? "Hide butterfly" : "Show butterfly";
    },
    open () {
      return this.poi.open;
    },
    ...mapState({
      wxTime: state => state.weather.time,
    }),
  },
  methods: {
    onDelete () {
      this.$store.commit('ui/poi/delPoi', this.poi.id);
    },
    onButterfly () {
      this.$store.commit('ui/poi/toggleButterfly', this.poi.id);
    },
    updatePopupState () {
      if (this.recursionTrap) {
        return;
      }
      this.recursionTrap = true;
      for (const el of this.$refs.popupctrl) {
        if (this.open) {
          el.mapObject.openPopup();
        } else {
          el.mapObject.closePopup();
        }
      }
      this.recursionTrap = false;
    },
    onOpen () {
      this.$store.commit('ui/poi/setOpen', {
        id: this.poi.id,
        open: true,
      });
    },
    onClose () {
      this.$store.commit('ui/poi/setOpen', {
        id: this.poi.id,
        open: false,
      });
    },
    latLngAddOffset,
  },
  watch: {
    open () {
      this.updatePopupState();
    },
  },
  mounted () {
    this.$nextTick(() => {
      this.updatePopupState();
    });
  },
}
</script>
