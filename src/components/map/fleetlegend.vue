<template>
  <l-control
    id = "fleet-info-ctrl"
    :position = "'bottomleft'"
  >
    <div
      v-if = "combinedIds.length > 0"
      id = "fleet-info"
    >
      <div
        class = "fleet-row"
        v-for = "boat in legendBoats"
        :key = "boat.id"
      >
        <div
          class = "color-block"
          :style = "{ 'background-color': boatColor(boat) }"
        />
        <span class = "boat-ranking">{{boat.ranking}}</span>
        <country-flag :country = "boat.country"/>
        <syc-flag :syc = "boat.syc"/>
        <span class = "boat-name">{{ boat.name }}</span>
        <span v-if="multiClassRace">
          ({{ boat.type}})
        </span>
      </div>
      <div v-if = "countNonExpandedBoats > 0">
        +{{countNonExpandedBoats}} boats
      </div>
    </div>
  </l-control>
</template>

<script>
import { mapGetters, mapState } from 'vuex';
import { LControl } from 'vue2-leaflet';
import CountryFlag from '../countryflag.vue';
import SycFlag from '../sycflag.vue';

export default {
  name: 'FleetLegend',
  components: {
    'l-control': LControl,
    'country-flag': CountryFlag,
    'syc-flag': SycFlag,
  },
  data () {
    return {
      maxSelectedBoats: 5,
      maxHoverBoats: 3,
    }
  },
  computed: {
    legendBoats () {
      return this.showIds.map(id => this.fleetBoatFromId(id));
    },
    countNonExpandedBoats () {
      return this.combinedIds.length - this.legendBoats.length;
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      boatColor: 'race/fleet/boatColor',
      multiClassRace: 'race/fleet/multiClassRace',
      showIds: 'race/fleet/showIds',
      combinedIds: 'race/fleet/combinedIds',
    }),
    ...mapState({
      selectedObj: state => state.race.fleet.selected,
      hoverObj: state => state.race.fleet.hover,
    }),
  },
}
</script>

<style scoped>
#fleet-info-ctrl {
  pointer-events: none;
  margin: 2px;
}
#fleet-info {
  text-align: left;
  margin: 2px;
  font-size: 10px;
}
.fleet-row {
  margin: 1px;
}
.color-block {
  display: inline-block;
  width: 12px;
  min-width: 12px;
  height: 12px;
}
.boat-ranking, .boat-name {
  margin: 2px;
}
</style>
