<template>
  <l-layer-group>
    <l-layer-group
      v-for = "line in lines"
      :key = "line.offset"
    >
      <l-polyline
        :lat-lngs = "line.line"
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
      <l-circle-marker
        :lat-lng = "line.line[0]"
        :radius = "3"
        :color = "color"
        :weight = "1"
        :fill = "false"
      />
      <l-circle-marker
        v-if = "segment.lastSegment"
        :lat-lng = "line.line[line.line.length - 1]"
        :radius = "3"
        :color = "color"
        :weight = "1"
        :fill = "false"
      />
    </l-layer-group>
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup, LPolyline, LTooltip, LCircleMarker } from 'vue2-leaflet';
import { radToDeg, latLngArrayAddOffset } from '../../../lib/utils.js';
import PathDistance from '../../distance.vue';

export default {
  name: 'RulerSegment', 
  components: {
    'l-layer-group': LLayerGroup,
    'l-polyline': LPolyline,
    'l-tooltip': LTooltip,
    'l-circle-marker': LCircleMarker,
    'path-distance': PathDistance,
  },
  props: {
    worldCopyWrap: {
      type: Boolean,
      default: true,
    },
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
    lines () {
      let res = [];
      let wrapList = this.worldCopyWrap ? this.mapWrapList : [0];
      // ADDME: when the second point crosses anti-meridian compared with
      // the first point, we need to add more copies

      for (const offset of wrapList) {
        res.push({
          offset: offset,
          line: latLngArrayAddOffset(this.segment.line, offset),
        });
      }
      return res;
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
    ...mapState({
      mapWrapList: state => state.map.wrapList,
    }),
  },
}
</script>
