<template>
  <l-layer-group v-if = "race.loaded && isPracticePeriod">
    <l-circle
      v-for = "(mark, index) in prMarks"
      :key = "index"
      :lat-lng = "mark.latLng"
      :stroke = "false"
      :fill-color = "markColor"
      :fill-opacity = "1"
      :radius = "mark.radius"
    >
      <l-tooltip
        :options="markTooltipOptions"
      >
        {{mark.name}}
      </l-tooltip>
    </l-circle>
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup, LCircle, LTooltip } from 'vue2-leaflet';
import { degToRad } from '../../lib/utils.js';
import { gcCalc } from '../../lib/nav.js';
import { EARTH_R } from '../../lib/sol.js';

export default {
  name: 'PrMarks',
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle': LCircle,
    'l-tooltip': LTooltip,
  },

  data () {
    return {
      markRadius: 3.5,
      markColor: "#ff00ff",
      markTooltipOptions: {
        permanent: true,
        direction: 'right',
        className: 'wp-tooltip pr-tooltip',
      },
    }
  },

  computed: {
    maxMark () {
      this.name2idStamp;

      let i = 1;
      // eslint-disable-next-line
      while (true) {
        const name = 'Practice_Mark_' + i;
        const markBoat = this.$store.getters['race/fleet/boatFromName'](name);
        if (markBoat === null) {
          break;
        }
        i++;
      }
      return i - 1;
    },
    prMarks () {
      const EARTH_CIRC = 2 * Math.PI * EARTH_R;
      let res = [];
      for (let i = 1; i < this.maxMark; i++) {
        const name = 'Practice_Mark_' + i;
        const markBoat = this.$store.getters['race/fleet/boatFromName'](name);
        if (markBoat === null) {
          break;
        }
        const fromStart = gcCalc(this.raceStartPosition, markBoat.latLng);
        /* Don't draw marks when too close to the start position */
        if (fromStart.distance * EARTH_R / 1852.0 < 0.1) {
          continue;
        }
        res.push({
          name: 'M' + i,
          latLng: markBoat.latLng,
          /*
           * Scale radius to match what the old client does, it has 9px
           * marks.
           */
          radius: Math.cos(degToRad(markBoat.latLng.lat)) / Math.pow(2, 17 + 8) *
                  4.5 * EARTH_CIRC,
        });
        i++;
      }
      return res;
    },
    ...mapState({
      race: state => state.race,
      boat: state => state.race.fleet.boat,
      name2idStamp: state => state.race.fleet.name2idStamp,
    }),
    ...mapGetters({
      isPracticePeriod: 'race/isPracticePeriod',
      raceStartPosition: 'race/startPosition',
    }),
  },
}
</script>
