<template>
  <l-polyline
    :lat-lngs = "line"
    :color = "color"
    :weight = "1"
    :fill = "false"
  >
    <l-tooltip
      :options="lineTooltipOptions"
    >
      <path-distance :path = "segment"/>
    </l-tooltip>
  </l-polyline>
</template>

<script>
import { LPolyline, LTooltip } from 'vue2-leaflet';
import { radToDeg } from '../../../lib/utils.js';
import PathDistance from '../../distance.vue';

export default {
  name: 'RulerSegment', 
  components: {
    'l-polyline': LPolyline,
    'l-tooltip': LTooltip,
    'path-distance': PathDistance,
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
    lineTooltipOptions () {
      let direction;
      const dir = radToDeg(this.segment.startBearing);
      if (dir < 45) {
        direction = 'right';
      } else if (dir < 135) {
        direction = 'bottom';
      } else if (dir < 225) {
        direction = 'right';
      } else if (dir < 305) {
        direction = 'bottom';
      } else {
        direction = 'right';
      }

      return {
        permanent: true,
        direction: direction,
        className: 'ruler-line-tooltip ruler-line-tooltip-' + direction,
      }
    },
  },
}
</script>
