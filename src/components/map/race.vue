<template>
  <l-layer-group v-if="this.race.loaded">
    <l-rectangle
       :bounds="this.raceBoundary"
       :fill="false"
       :weight="2"
       color="magenta"
    />
    <l-circle-marker
      v-for="(waypoint, index) in this.raceRoute"
      :key="index"
      :lat-lng="waypoint.latLng"
      :fill-color="wpColor"
      :radius="waypoint.radius"
      :color="wpColor"
      :fill-opacity="1"
    >
      <l-tooltip
        :options="wpTooltipOptions"
      >
        <span v-html="waypoint.name"/><br>
        {{waypoint.info}}
      </l-tooltip>
    </l-circle-marker>
    <l-circle-marker
      v-for="(endpoint, index) in this.finishLine"
      :key="'f' + index"
      :lat-lng="endpoint"
      :fill-color="wpColor"
      :radius="finishPointRadius"
      :color="wpColor"
      :fill-opacity="1"
    />
    <l-polyline
      :lat-lngs="finishLine"
      :fill="false"
      :color="wpColor"
      :weight="1"
    />
    <l-polyline
      v-for="(line, index) in this.routeLine"
      :key="'ls' + index"
      :lat-lngs="line"
      :fill="false"
      :color="wpColor"
      :weight="1"
    />
    <l-polyline
      v-for="(line, index) in this.wpArcs"
      :key="'la' + index"
      :lat-lngs="line.arc"
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
import { LLayerGroup, LCircleMarker, LPolyline, LRectangle, LTooltip } from 'vue2-leaflet';
import { latLngAddOffset } from '../../lib/utils.js';
import { PROJECTION } from '../../lib/sol.js';
import { degToRad } from '../../lib/utils.js';

export default {
  name: 'Map',
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle-marker': LCircleMarker,
    'l-polyline': LPolyline,
    'l-rectangle': LRectangle,
    'l-tooltip': LTooltip,
  },

  props: {
    map: {
      type: Object,
      required: true,
    },
    lngOffset: {
      type: Number,
      default: 0,
    }
  },
  data () {
    return {
      wpColor: "red",
      wpTooltipOptions: {
        permanent: true,
        direction: 'right',
        className: 'wp-tooltip',
      },
      finishPointRadius: 1,
      routeLineGap: 10,
      routeLineArcInterval: degToRad(5),
    }
  },

  computed: {
    raceBoundary () {
      return [latLngAddOffset(this.race.boundary[0], this.lngOffset),
              latLngAddOffset(this.race.boundary[1], this.lngOffset)];
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
        }
        route.push({
          latLng: latLngAddOffset(this.race.route[i].latLng, this.lngOffset),
          name: this.race.route[i].name,
          radius: !this.isFinishMark(i) ? 2 : this.finishPointRadius,
          info: this.markInfoText(i),
          arc: arc,
        });
      }
      return route;
    },
    finishLine () {
      return this.race.finish.map(pt => latLngAddOffset(pt, this.lngOffset));
    },
    routeLine () {
      let res = [];
      let line = [];
      for (let i = 0; i < this.raceRoute.length; i++) {
        if (this.isStartMark(i)) {
          line.push(this.raceRoute[i].latLng);
        } else if (this.isFinishMark(i)) {
          line.push(this.raceRoute[i].latLng);
          res.push(line);
        } else {
          const wpLatLng = this.raceRoute[i].latLng;
          const prevAngle = this.raceRoute[i].arc.prevAngle;
          const turnAngle = this.raceRoute[i].arc.turnAngle;

          line.push(this.wpArcLatLng(wpLatLng, prevAngle));
          res.push(line);
          line = [this.wpArcLatLng(wpLatLng, turnAngle + prevAngle)];
        }
      }

      return res;
    },
    wpArcs () {
      let res = [];
      for (let i = 1; i < this.raceRoute.length - 1; i++) {
        let arc = [];
        const wpLatLng = this.raceRoute[i].latLng;
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
            arc: arc,
            midPoint: {
              latLng: this.wpArcLatLng(wpLatLng, turnAngle / 2 + prevAngle),
              angle: turnAngle / 2 + prevAngle,
            },
          });
        }
      }

      return res;
    },
    ...mapState({
      race: state => state.race,
      lastRoundedMark: state => state.boat.lastRoundedMark,
      finishTime: state => state.boat.finishTime,
      zoom: state => state.map.zoom,
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
