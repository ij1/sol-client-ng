<template>
  <l-control
    id = "fleet-info-ctrl"
    :position = "'bottomleft'"
  >
    <div
      v-if = "this.allIds.length > 0"
      id = "fleet-info"
    >
      <div
        class = "fleet-row"
        v-for = "boat in this.legendBoats"
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
      <div v-if = "this.countNonExpandedBoats > 0">
        +{{this.countNonExpandedBoats}} boats
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
    selectedSorted () {
      return this.sortedIdList(Object.keys(this.selectedObj));
    },
    hoverSorted () {
      return this.sortedIdList(Object.keys(this.hoverObj));
    },
    showIds () {
      let selected = this.selectedSorted.slice(0, this.maxSelectedBoats);
      let hover = this.hoverSorted.slice(0 , this.maxHoverBoats);
      return this.sortedIdList(selected.concat(hover));
    },
    allIds () {
      return this.sortedIdList(this.selectedSorted.concat(this.hoverSorted));
    },
    legendBoats () {
      return this.showIds.map(id => this.fleetBoatFromId(id));
    },
    countNonExpandedBoats () {
      return this.allIds.length - this.legendBoats.length;
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      boatColor: 'race/fleet/boatColor',
      multiClassRace: 'race/fleet/multiClassRace',
    }),
    ...mapState({
      selectedObj: state => state.race.fleet.selected,
      hoverObj: state => state.race.fleet.hover,
    }),
  },
  methods: {
    /* Besides sorting, this filters duplicates from the list */
    sortedIdList (boatIdsObj) {
      let self = this;
      return boatIdsObj.sort((a, b) => {
        const boatA = self.fleetBoatFromId(a);
        const boatB = self.fleetBoatFromId(b);
        const aa = boatA.ranking;
        const bb = boatB.ranking;
        const diff = aa - bb;
        if (diff !== 0) {
          return diff;
        }
        return boatA.id - boatB.id;
      }).filter(function(item, idx, arr) {
        return (idx === arr.length - 1) || (arr[idx + 1] !== item);
      });
    },
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
