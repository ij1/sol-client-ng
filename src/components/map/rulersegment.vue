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
      {{info}}
    </l-tooltip>
  </l-polyline>
</template>

<script>
import { LPolyline, LTooltip } from 'vue2-leaflet';
import { radToDeg } from '../../lib/utils.js';
import { roundToFixed } from '../../lib/quirks.js';
import { EARTH_R } from '../../lib/sol.js';

export default {
  name: 'RulerSegment', 
  components: {
    'l-polyline': LPolyline,
    'l-tooltip': LTooltip,
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
    info () {
      return roundToFixed(this.segment.distance * EARTH_R / 1852, 3) + 'nm @' +
             roundToFixed(radToDeg(this.segment.startBearing), 2) + '\xb0';
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

<style>
.ruler-line-tooltip {
  background: transparent;
  border: 0px;
  color: black;
  padding: 0px;
  box-shadow: unset;
  line-height: 1.05;
}

.ruler-line-tooltip::before {
  all: unset;
}

.ruler-line-tooltip-right {
  padding-left: 5px;
  text-align: left;
}

.ruler-line-tooltip-bottom {
  padding-top: 5px;
  text-align: center;
}
</style>
