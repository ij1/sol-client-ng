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
      :latLng="waypoint.latLng"
      :fillColor="wpColor"
      :radius="waypoint.radius"
      :color="wpColor"
      :fillOpacity="1"
    >
      <l-tooltip
        :options="wpTooltipOptions"
      >
        <span v-html="waypoint.name"/><br>
        {{waypoint.info}}
      </l-tooltip>
    </l-circle-marker>
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup, LCircleMarker, LRectangle, LTooltip } from 'vue2-leaflet'
import { latLngAddOffset } from '../../lib/utils.js';
import { minTurnAngle, atan2Bearing } from '../../lib/nav.js';

export default {
  name: 'Map',
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle-marker': LCircleMarker,
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
        let loxoDiff = this.loxoDiffAtMark(i);

        route.push({
          latLng: latLngAddOffset(this.race.route[i].latLng, this.lngOffset),
          name: this.race.route[i].name,
          radius: (i !== this.race.route.length - 1) ? 2 : 1,
          info: this.markInfoText(i, loxoDiff),
        });
      }
      return route;
    },
    ...mapState({
      race: state => state.race,
      lastRoundedMark: state => state.boat.current_leg,
      finishTime: state => state.boat.finish_time,
    }),
  },

  methods: {
    markInfoText (mark, angle) {
      if (mark === 0) {
        return "(Start)";
      }

      if (mark < this.race.route.length - 1) {
        if (mark <= this.lastRoundedMark) {
          return "Rounded.";
        }

        return "Leave to " + (angle < 0 ? "Port" : "Starboard");
      }

      return this.finishTime === null ? "Cross line to Finish" : "Finished.";
    },
    loxoDiffAtMark(mark) {
      if ((mark <= 0) || (mark >= this.race.route.length - 1)) {
        return undefined;
      }

      let projected = [];
      for (let i = -1; i <= 1; i++) {
        const latLng = latLngAddOffset(this.race.route[mark + i].latLng,
                                       this.lngOffset);
        projected.push(this.map.project(latLng));
      }

      let angles = [];
      for (let i = 0; i <= 1; i++) {
        angles.push(atan2Bearing(projected[i+1].x - projected[i].x,
                                 -(projected[i+1].y - projected[i].y)));
      }

      return minTurnAngle(angles[1], angles[0]);
    },
  },
}
</script>
