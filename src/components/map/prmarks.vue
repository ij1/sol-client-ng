<template>
  <l-layer-group v-if = "race.loaded && isPracticePeriod">
    <l-circle
      v-for = "(mark, index) in prMarks"
      :key = "index"
      :lat-lng = "mark.latLng"
      :stroke = "false"
      :fill-color = "markColor"
      :fill-opacity = "1"
      :radius = "markRadius"
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
      let res = [];
      for (let i = 1; i < this.maxMark; i++) {
        const name = 'Practice_Mark_' + i;
        const markBoat = this.$store.getters['race/fleet/boatFromName'](name);
        if (markBoat === null) {
          break;
        }
        /* ADDME: don't put label when at the start position */
        res.push({
          name: 'M' + i,
          latLng: markBoat.latLng,
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
    }),
  },
}
</script>
