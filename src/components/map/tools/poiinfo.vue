<template>
  <div>
    <div>
      <map-coordinate :lat-lng = "poi.latLng"/>
    </div>
    <div v-if = "boatPosition !== null">
      <div>
        <path-distance :path = "loxoPath"/>
      </div>
      <div>
        <path-distance :path = "gcPath"/>
      </div>
      <div>
        VMG: {{vmg}}kn
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import MapCoordinate from '../../coordinate.vue';
import PathDistance from '../../distance.vue';
import { gcCalc, loxoCalc, speedTowardsBearing } from '../../../lib/nav.js';
import { roundToFixed } from '../../../lib/quirks.js';

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
    vmg () {
      return roundToFixed(speedTowardsBearing(this.boatSpeed, this.boatCourse,
                                              this.gcPath.startBearing),
                          this.instrumentDecimals);
    },
    loxoPath () {
      // FIXME: Handle wraps better, maybe do different loxoCalc function?
      return loxoCalc(this.boatPosition, this.poi.latLng);
    },
    ...mapState({
      boatPosition: state => state.boat.position,
      boatSpeed: state => state.boat.instruments.speed.value,
      boatCourse: state => state.boat.instruments.course.value,
      instrumentDecimals: state => state.boat.instruments.cfg.instrumentDecimals.value,
    }),
  },
}
</script>
