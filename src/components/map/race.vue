<template>
  <l-layer-group v-if="race.loaded">
    <l-polyline
       v-for = "boundary in wrappedBoundaries"
       :key = "boundary.key"
       :lat-lngs = "boundary.boundary"
       :fill="false"
       :weight="2"
       color="magenta"
    />
    <route-mark
      v-for = "waypoint in wrappedMarks"
      :key = "waypoint.key"
      :lat-lng = "waypoint.latLng"
      :rounding-arrow-angle = "race.route[waypoint.index].arc.midAngle"
      :rounding-side = "race.route[waypoint.index].side"
      :color = "markDetail[waypoint.index].color"
      :mark-radius = "markDetail[waypoint.index].radius"
    >
      <l-tooltip
        :options="wpTooltipOptions"
      >
        <span
          :style = "{color: markDetail[waypoint.index].color}"
          v-html="markDetail[waypoint.index].info"
        />
      </l-tooltip>
    </route-mark>
    <route-mark
      v-for = "mark in wrappedFinishLineMarks"
      :key = "mark.key"
      :lat-lng = "mark.latLng"
      :color = "finishLineColor"
      :mark-radius="finishPointRadius"
    />
    <l-polyline
      v-for = "line in wrappedFinishLines"
      :key = "line.key"
      :lat-lngs = "line.line"
      :fill="false"
      :color="finishLineColor"
      :weight="1"
    />
    <l-polyline
      v-for = "line in wrappedLines"
      :key = "line.key"
      :lat-lngs = "line.line"
      :fill="false"
      :color="line.color"
      :weight="1"
    />
    <l-polyline
      v-for = "line in wrappedArcs"
      :key = "line.key"
      :lat-lngs = "line.arc"
      :fill="false"
      :color="line.color"
      :weight="1"
      :smooth-factor="0.1"
    />
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { LLayerGroup, LPolyline, LTooltip } from 'vue2-leaflet';
import RouteMark from './routemark.vue';
import { latLngAddOffset, latLngArrayAddOffset } from '../../lib/utils.js';
import { PROJECTION } from '../../lib/sol.js';
import { degToRad } from '../../lib/utils.js';

export default {
  name: 'RaceInfo',
  components: {
    'l-layer-group': LLayerGroup,
    'l-polyline': LPolyline,
    'l-tooltip': LTooltip,
    'route-mark': RouteMark,
  },

  data () {
    return {
      wpColor: "red",
      wpTooltipOptions: {
        permanent: true,
        direction: 'right',
        className: 'wp-tooltip',
      },
      finishPointRadius: 3,
      routeLineGap: 10,
      routeLineArcInterval: degToRad(5),
      finishWrapList: [-360, 0, 360],  /* No need to wrap more when zoomed away */
    }
  },

  computed: {
    extraWrapList () {
      if (this.raceBoundary[1].lng < 180) {
        return this.mapWrapList;
      }
      /*
       * When the race area east boundary spans across anti-meridian,
       * the westmost wrapped copy must be extented beyond the normal
       * range.
       */
      return this.mapWrapList.concat(this.mapWrapList[0] - 360);
    },
    boundaryPolylines () {
      /* Spanning the whole Earth? */
      if (this.raceBoundary[0].lng + 360 <= this.raceBoundary[1].lng) {
        return [
          [
            this.raceBoundary[0],
            L.latLng(this.raceBoundary[0].lat, this.raceBoundary[1].lng),
          ], [
            this.raceBoundary[1],
            L.latLng(this.raceBoundary[1].lat, this.raceBoundary[0].lng),
          ]
        ];
      }
      return [[
        this.raceBoundary[0],
        L.latLng(this.raceBoundary[0].lat, this.raceBoundary[1].lng),
        this.raceBoundary[1],
        L.latLng(this.raceBoundary[1].lat, this.raceBoundary[0].lng),
        this.raceBoundary[0],
      ]];
    },
    wrappedBoundaries () {
      let res = [];
      for (const offset of this.mapWrapList) {
        for (let i = 0; i < this.boundaryPolylines.length; i++) {
          res.push({
            key: 'b_' + i + '_' + offset,
            boundary: latLngArrayAddOffset(this.boundaryPolylines[i], offset),
          });
        }
      }
      return res;
    },
    markDetail () {
      let route = [];

      for (let i = 0; i < this.race.route.length; i++) {
        let alpha = this.wpAlpha(i);
        let color = 'rgba(255,0,0,' + alpha + ')';
        if (alpha === '1') {
          color = 'red';
        }

        let info = this.markInfoText(i);
        let text = this.race.route[i].name +
                   (info.length > 0 ? '<br>' + info : '');

        /* Try to eliminate duplicated labels */
        let legDistance = Math.abs(i - this.lastRoundedMark);
        for (let d of this.race.route[i].duplicate) {
          let otherDistance = Math.abs(d - this.lastRoundedMark);
          if ((otherDistance < legDistance) ||
              (otherDistance == legDistance && i < d)) {
            text = '';
            break;
          }
        }

        route.push({
          info: text,
          color: color,
          radius: !this.isFinishMark(i) ? 4 : this.finishPointRadius,
        });
      }
      return route;
    },
    wrappedMarks () {
      let res = [];
      for (const offset of this.mapWrapList) {
        for (let i = 0; i < this.race.route.length; i++) {
          res.push({
            latLng: latLngAddOffset(this.race.route[i].latLng, offset),
            index: i,
            key: 'm_' + offset + '_' + i,
          });
        }
      }
      return res;
    },
    wrappedFinishLines () {
      let res = [];
      for (const offset of this.finishWrapList) {
        res.push({
          key: 'f_' + offset,
          line: this.race.finish.map(pt => latLngAddOffset(pt, offset)),
        });
      }
      return res;
    },
    wrappedFinishLineMarks () {
      let res = [];
      for (const offset of this.finishWrapList) {
        for (let i = 0; i < this.race.finish.length; i++) {
          res.push({
            key: 'fm_' + offset + '_' + i,
            latLng: latLngAddOffset(this.race.finish[i], offset),
          });
        }
      }
      return res;
    },
    finishLineColor () {
      if (this.cfgCourseDrawMode === 'default') {
        return 'red';
      }
      return 'rgba(255,0,0,' + this.wpAlpha(this.race.route.length - 1) + ')';
    },
    wrappedLines () {
      let res = [];
      let line = [];
      for (const offset of this.mapWrapList) {
        for (let i = 0; i < this.race.route.length; i++) {
          if (this.isStartMark(i)) {
            line.push(latLngAddOffset(this.race.route[i].latLng, offset));
          } else if (this.isFinishMark(i)) {
            line.push(latLngAddOffset(this.race.route[i].latLng, offset));
            res.push({
              key: 'l_' + offset + '_' + i,
              color: this.markDetail[i].color,
              line: line,
            });
            line = [];
          } else {
            const wpLatLng = latLngAddOffset(this.race.route[i].latLng, offset);
            const prevAngle = this.race.route[i].arc.prevAngle;
            const turnAngle = this.race.route[i].arc.turnAngle;

            line.push(this.wpArcLatLng(wpLatLng, prevAngle));
            res.push({
              key: 'l_' + offset + '_' + i,
              color: this.markDetail[i].color,
              line: line,
            });
            line = [this.wpArcLatLng(wpLatLng, turnAngle + prevAngle)];
          }
        }
      }

      return res;
    },
    wrappedArcs () {
      let res = [];
      for (const offset of this.mapWrapList) {
        for (let i = 1; i < this.race.route.length - 1; i++) {
          let arc = [];
          const wpLatLng = latLngAddOffset(this.race.route[i].latLng, offset);
          const prevAngle = this.race.route[i].arc.prevAngle;
          const turnAngle = this.race.route[i].arc.turnAngle;

          let middleDone = false;
          for (let a = 0; a < Math.abs(turnAngle); a += this.routeLineArcInterval) {
            const angle = Math.sign(turnAngle) * a;
            if (!middleDone && (Math.abs(angle) > Math.abs(turnAngle) / 2)) {
              arc.push(this.wpArcLatLng(wpLatLng, turnAngle / 2 + prevAngle));
              middleDone = true;
            }
            arc.push(this.wpArcLatLng(wpLatLng, angle + prevAngle));
          }
          if (Math.abs(turnAngle) > 0) {
            arc.push(this.wpArcLatLng(wpLatLng, turnAngle + prevAngle));
            res.push({
              key: 'a_' + offset + '_' + i,
              arc: arc,
              color: this.markDetail[i].color,
              midPoint: {
                latLng: this.wpArcLatLng(wpLatLng, turnAngle / 2 + prevAngle),
                angle: turnAngle / 2 + prevAngle,
              },
            });
          }
        }
      }
      return res;
    },
    ...mapState({
      race: state => state.race,
      raceBoundary: state => state.race.boundary,
      lastRoundedMark: state => state.boat.lastRoundedMark,
      finishTime: state => state.boat.finishTime,
      zoom: state => state.map.zoom,
      mapWrapList: state => state.map.wrapList,
      cfgCourseDrawMode: state => state.map.cfg.courseDrawMode.value,
    }),
  },

  methods: {
    isStartMark (mark) {
      return mark === 0;
    },
    isFinishMark (mark) {
      return mark === this.race.route.length - 1;
    },
    isIntermediateMark (mark) {
      return (mark > 0) && (mark < this.race.route.length - 1);
    },
    markInfoText (mark) {
      if (this.isStartMark(mark)) {
        return "(Start)";
      }

      if (mark > this.lastRoundedMark + 1) {
        return "";
      }
      if (this.isIntermediateMark(mark)) {
        if (mark <= this.lastRoundedMark) {
          return "Rounded.";
        }

        return "Leave to " + this.race.route[mark].side;
      }

      return this.finishTime === null ? "Cross line to Finish" : "Finished.";
    },
    wpAlpha (mark) {
      if (this.cfgCourseDrawMode === 'default') {
        return '1';
      }
      let markIdxDist = this.lastRoundedMark - mark + 1;
      markIdxDist = this.cfgCourseDrawMode === 'oldfade' ?
                    Math.max(markIdxDist, 0) :
                    Math.abs(markIdxDist);
      return 1.0 - 0.2 * Math.min(Math.max(markIdxDist - 1, 0), 3);
    },
    wpArcLatLng (wpLatLng, angle) {
      let pt = PROJECTION.latLngToPoint(wpLatLng, this.zoom);
      const delta = L.point(this.routeLineGap * Math.sin(angle),
                            this.routeLineGap * -Math.cos(angle));
      return PROJECTION.pointToLatLng(pt.add(delta), this.zoom);
    },
  },
}
</script>
