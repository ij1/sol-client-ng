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
        <span v-html="waypoint.name"/>
      </l-tooltip>
    </l-circle-marker>
  </l-layer-group>
</template>

<script>
import { mapState } from 'vuex';
import { LLayerGroup, LCircleMarker, LRectangle, LTooltip } from 'vue2-leaflet'
import { latLngAddOffset } from '../../lib/utils.js';

export default {
  name: 'Map',
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle-marker': LCircleMarker,
    'l-rectangle': LRectangle,
    'l-tooltip': LTooltip,
  },

  props: {
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
        route.push({
          latLng: latLngAddOffset(this.race.route[i].latLng, this.lngOffset),
          name: this.race.route[i].name,
          radius: (i !== this.race.route.length - 1) ? 2 : 1,
        });
      }
      return route;
    },
    ...mapState({
      race: state => state.race,
    }),
  },
}
</script>
