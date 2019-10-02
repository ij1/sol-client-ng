<template>
  <l-layer-group>
    <l-layer-group
      v-for = "line in lines"
      :key = "line.offset"
    >
      <l-polyline
        v-if = "!zeroLen"
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
        v-if = "!zeroLen"
        :lat-lng = "line.line[0]"
        :radius = "3"
        :color = "color"
        :weight = "0.5"
        :fill = "false"
      />
      <l-circle-marker
        v-if = "terminatesPath"
        :lat-lng = "line.line[line.line.length - 1]"
        :radius = "3"
        :color = "color"
        :weight = "0.5"
        :fill = "false"
      >
        <l-tooltip
          :options="lineTooltipOptions"
        >
          {{segment.totalDistance | distance}}nm
        </l-tooltip>
      </l-circle-marker>
    </l-layer-group>
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup, LPolyline, LTooltip, LCircleMarker } from 'vue2-leaflet';
import L from 'leaflet';
import { degToRad, radToDeg, latLngArrayAddOffset } from '../../../lib/utils.js';
import { distanceMixin } from '../../mixins/distance.js';
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
  mixins: [distanceMixin],
  props: {
    worldCopyWrap: {
      type: Boolean,
      default: true,
    },
    segment: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
    },
    color: {
      type: String,
      required: true,
    },
  },
  computed: {
    zeroLen () {
      return this.segment.line[0].equals(this.segment.line[1]);
    },
    lines () {
      let res = [];
      let line = this.segment.line;

      if (this.segment.navMode === 'ortho') {
        line = this.gcLine();
      }

      let wrapList = this.worldCopyWrap ? this.mapWrapList : [0];

      for (const offset of wrapList) {
        res.push({
          offset: offset,
          line: latLngArrayAddOffset(line, offset),
        });
      }
      return res;
    },
    wrappedLastPoint () {
      return this.segment.wrappedLine[this.segment.wrappedLine.length - 1];
    },
    nextSegmentFirstPoint () {
      if (this.index < this.allRulerSegments.length - 1) {
        return this.allRulerSegments[this.index + 1].wrappedLine[0];
      }
      return null;
    },
    terminatesPath () {
      if (this.index === null) {
        return true;
      }
      if (this.nextSegmentFirstPoint === null) {
        return (this.rulerPendingPosition === null) || !this.rulerExtendingPath;
      }
      if (this.wrappedLastPoint.equals(this.nextSegmentFirstPoint)) {
        return false;
      }
      return true;
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
      allRulerSegments: state => state.ui.ruler.rulerSegments,
      rulerPendingPosition: state => state.ui.rulerPendingPosition,
    }),
    ...mapGetters({
      rulerExtendingPath: 'ui/ruler/extendingPath',
    }),
  },
  methods: {
    gcLine () {
      if (this.zeroLen) {
        return this.segment.line;
      }
      const bearing1 = this.segment.startBearing;
      const lat1 = degToRad(this.segment.line[0].lat);
      const lon1 = degToRad(this.segment.line[0].lng);
      const sina1 = Math.sin(bearing1);
      const cosa1 = Math.cos(bearing1);
      const slat1 = Math.sin(lat1);
      const clat1 = Math.cos(lat1);
      const dividend = sina1 * clat1;
      const divisor = cosa1 * cosa1 + sina1 * sina1 * slat1 * slat1;
      const bearing0 = Math.atan2(dividend, Math.sqrt(divisor));

      let dist01;
      if ((lat1 === 0) && (bearing1 === Math.PI / 2)) {
        dist01 = 0;
      } else {
        dist01 = Math.atan2(Math.tan(lat1), cosa1);
      }
      const lon0 = lon1 - Math.atan2(Math.sin(bearing0) * Math.sin(dist01), Math.cos(dist01));

      let res = [this.segment.line[0]];
      if (bearing0 !== 0) {
        const cot0 = 1 / Math.tan(bearing0);
        const lon2 = degToRad(this.segment.line[this.segment.line.length - 1].lng);
        const dlon = lon2 - lon1;
        const iterCount = 150;
        const lonStep = dlon / iterCount;
        let lon = lon1;
        for (let i = 0; i < iterCount; i++) {
          lon += lonStep;
          let lat = Math.atan(cot0 * Math.sin(lon - lon0));
          res.push(L.latLng(radToDeg(lat), radToDeg(lon)));
        }
      }
      res.push(this.segment.line[this.segment.line.length - 1]);

      return res;
    },
  },
}
</script>
