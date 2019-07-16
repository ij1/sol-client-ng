<template>
  <div>
    <map-coordinate :lat-lng = "poi.latLng"/>
  </div>
</template>

<script>
import MapCoordinate from '../../coordinate.vue';

export default {
  name: 'PoiInfo',
  components: {
    'map-coordinate': MapCoordinate,
  },
  props: {
    poi: {
      type: Object,
      required: true,
    },
  },
}
</script>
