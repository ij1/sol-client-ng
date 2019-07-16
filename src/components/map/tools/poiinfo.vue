<template>
  <div>
    <div>
      <map-coordinate :lat-lng = "poi.latLng"/>
    </div>
    <div>
      <path-distance :path = "loxoPath"/>
    </div>
    <div>
      <path-distance :path = "gcPath"/>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import MapCoordinate from '../../coordinate.vue';
import PathDistance from '../../distance.vue';
import { gcCalc, loxoCalc } from '../../../lib/nav.js';

export default {
  name: 'PoiInfo',
  components: {
    'map-coordinate': MapCoordinate,
    'path-distance': PathDistance,
  },
  props: {
    poi: {
      type: Object,
      required: true,
    },
  },
  computed: {
    gcPath () {
      return gcCalc(this.boatPosition, this.poi.latLng);
    },
    loxoPath () {
      // FIXME: Handle wraps better, maybe do different loxoCalc function?
      return loxoCalc(this.boatPosition, this.poi.latLng);
    },
    ...mapState({
      boatPosition: state => state.boat.position,
    }),
  },
}
</script>
