<template>
  <l-layer-group v-if="race.loaded">
    <l-rectangle
       v-for = "boundary in wrappedBoundaries"
       :key = "boundary.key"
       :bounds = "boundary.boundary"
       :fill="false"
       :weight="2"
       color="magenta"
    />
    <route-mark
      v-for = "waypoint in wrappedMarks"
      :key = "waypoint.key"
      :lat-lng = "waypoint.latLng"
      :rounding-arrow-angle = "waypoint.arc.midAngle"
      :rounding-side = "waypoint.arc.side"
      :mark-radius = "waypoint.radius"
    >
      <l-tooltip
        :options="wpTooltipOptions"
      >
        <span v-html="waypoint.name"/><br>
        {{waypoint.info}}
      </l-tooltip>
    </route-mark>
    <route-mark
      v-for = "mark in wrappedFinishLineMarks"
      :key = "mark.key"
      :lat-lng = "mark.latLng"
      :mark-radius="finishPointRadius"
    />
    <l-polyline
      v-for = "line in wrappedFinishLines"
      :key = "line.key"
      :lat-lngs = "line.line"
      :fill="false"
      :color="wpColor"
      :weight="1"
    />
    <l-polyline
      v-for = "line in wrappedLines"
      :key = "line.key"
      :lat-lngs = "line.line"
      :fill="false"
      :color="wpColor"
      :weight="1"
    />
    <l-polyline
      v-for = "line in wrappedArcs"
      :key = "line.key"
      :lat-lngs = "line.arc"
      :fill="false"
      :color="wpColor"
      :weight="1"
      :smooth-factor="0.1"
    />
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import L from 'leaflet';
import { LLayerGroup, LPolyline, LRectangle, LTooltip } from 'vue2-leaflet';
import RouteMark from './routemark.vue';
import { latLngAddOffset } from '../../lib/utils.js';
import { PROJECTION } from '../../lib/sol.js';
import { degToRad } from '../../lib/utils.js';

export default {
  name: 'RaceInfo',
  components: {
    'l-layer-group': LLayerGroup,
    'l-polyline': LPolyline,
    'l-rectangle': LRectangle,
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
      if (this.race.boundary[1].lng < 180) {
        return this.mapWrapList;
      }
      /*
       * When the race area east boundary spans across anti-meridian,
       * the westmost wrapped copy must be extented beyond the normal
       * range.
       */
      return this.mapWrapList.concat(this.mapWrapList[0] - 360);
    },
    wrappedBoundaries () {
      let res = [];
      for (const offset of this.mapWrapList) {
        res.push({
          key: 'b_' + offset,
          boundary: [latLngAddOffset(this.race.boundary[0], offset),
                     latLngAddOffset(this.race.boundary[1], offset)],
        });
      }
      return res;
    },
    raceRoute () {
      let route = [];

      for (let i = 0; i < this.race.route.length; i++) {
        let arc = {}
        if (this.isIntermediateMark(i)) {
          arc.prevAngle = this.race.route[i-1].nextWpBearing;
          arc.nextAngle = this.race.route[i].nextWpBearing;
          arc.turnAngle = arc.nextAngle - arc.prevAngle;
          if (this.race.route[i].side === "Port") {
            arc.prevAngle += Math.PI / 2;
            arc.nextAngle += Math.PI / 2;
            if (arc.turnAngle > 0) {
              arc.turnAngle -= Math.PI * 2;
            }
          } else {
            arc.prevAngle -= Math.PI / 2;
            arc.nextAngle -= Math.PI / 2;
            if (arc.turnAngle < 0) {
              arc.turnAngle += Math.PI * 2;
            }
          }
          arc.midAngle = arc.prevAngle + arc.turnAngle / 2;
          arc.side = this.race.route[i].side;
        }

        route.push({
          latLng: this.race.route[i].latLng,
          name: this.race.route[i].name,
          info: this.markInfoText(i),
          arc: arc,
          radius: !this.isFinishMark(i) ? 4 : this.finishPointRadius,
        });
      }
      return route;
    },
    wrappedMarks () {
      let res = [];
      for (const offset of this.mapWrapList) {
        for (let i = 0; i < this.raceRoute.length; i++) {
          let copy = Object.assign({}, this.raceRoute[i]);
          copy.latLng = latLngAddOffset(this.raceRoute[i].latLng, offset);
          copy.key = 'm_' + offset + '_' + i;
          res.push(copy);
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
    wrappedLines () {
      let res = [];
      let line = [];
      for (const offset of this.mapWrapList) {
        for (let i = 0; i < this.raceRoute.length; i++) {
          if (this.isStartMark(i)) {
            line.push(latLngAddOffset(this.raceRoute[i].latLng, offset));
          } else if (this.isFinishMark(i)) {
            line.push(latLngAddOffset(this.raceRoute[i].latLng, offset));
            res.push({
              key: 'l_' + offset + '_' + i,
              line: line,
            });
            line = [];
          } else {
            const wpLatLng = latLngAddOffset(this.raceRoute[i].latLng, offset);
            const prevAngle = this.raceRoute[i].arc.prevAngle;
            const turnAngle = this.raceRoute[i].arc.turnAngle;

            line.push(this.wpArcLatLng(wpLatLng, prevAngle));
            res.push({
              key: 'l_' + offset + '_' + i,
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
        for (let i = 1; i < this.raceRoute.length - 1; i++) {
          let arc = [];
          const wpLatLng = latLngAddOffset(this.raceRoute[i].latLng, offset);
          const prevAngle = this.raceRoute[i].arc.prevAngle;
          const turnAngle = this.raceRoute[i].arc.turnAngle;

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
      lastRoundedMark: state => state.boat.lastRoundedMark,
      finishTime: state => state.boat.finishTime,
      zoom: state => state.map.zoom,
      mapWrapList: state => state.map.wrapList,
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

      if (this.isIntermediateMark(mark)) {
        if (mark <= this.lastRoundedMark) {
          return "Rounded.";
        }

        return "Leave to " + this.race.route[mark].side;
      }

      return this.finishTime === null ? "Cross line to Finish" : "Finished.";
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
