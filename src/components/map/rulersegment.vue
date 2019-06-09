<template>
  <l-polyline
    :lat-lngs = "line"
    :color = "color"
    :weight = "1"
    :fill = "false"
  />
</template>

<script>
import { LPolyline } from 'vue2-leaflet';

export default {
  name: 'RulerSegment', 
  components: {
    'l-polyline': LPolyline,
  },
  props: {
    segment: {
      type: Object,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
  },
  computed: {
    line () {
      return this.segment.line;
    },
  },
}
</script>
