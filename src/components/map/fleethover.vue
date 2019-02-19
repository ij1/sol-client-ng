<template>
  <l-control
    id = "fleet-info-ctrl"
    :position = "'bottomleft'"
  >
    <div
      v-if = "this.hoverListIds.length > 0"
      id = "fleet-info"
    >
      <div
        class = "fleet-row"
        v-for = "boat in this.hoverBoatList"
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
import { mapState, mapGetters } from 'vuex';
import { LControl } from 'vue2-leaflet';
import CountryFlag from '../countryflag.vue';
import SycFlag from '../sycflag.vue';

export default {
  name: 'FleetHover',
  components: {
    'l-control': LControl,
    'country-flag': CountryFlag,
    'syc-flag': SycFlag,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      maxExpandedBoats: 3,
    }
  },
  computed: {
    hoverListIdsAll () {
      /* Dummy dep */
      this.$store.state.race.fleet.fleetTime;

      if (this.hoverLatLng === null) {
        return [];
      }

      let res;
      for (let distance = 3; distance < 7; distance++) {
        res = this.$store.getters['race/fleet/searchAt'](this.hoverLatLng, this.zoom, distance);
        if (res.length > 0) {
          break;
        }
      }

      let self = this;
      return res.sort((a, b) => {
        const boatA = self.fleetBoatFromId(a.id);
        const boatB = self.fleetBoatFromId(b.id);
        const aa = boatA.ranking;
        const bb = boatB.ranking;
        const diff = aa - bb;
        if (diff !== 0) {
          return diff;
        }
        return boatA.id - boatB.id;
      }).map(i => i.id).filter(function(item, idx, arr) {
        return (idx === arr.length - 1) || (arr[idx + 1] !== item);
      });
    },
    hoverListIds () {
      return this.hoverListIdsAll.slice(0, this.maxExpandedBoats);
    },
    hoverBoatList () {
      let self = this;
      return this.hoverListIds.map(id => self.fleetBoatFromId(id));
    },
    countNonExpandedBoats () {
      return this.hoverListIdsAll.length - this.hoverBoatList.length;
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      boatColor: 'race/fleet/boatColor',
      multiClassRace: 'race/fleet/multiClassRace',
    }),
    ...mapState({
      hoverLatLng: state => state.map.hoverLatLng,
      zoom: state => state.map.zoom,
    }),
  },
  watch: {
    hoverListIds (newValue, oldValue) {
      if (newValue.length === oldValue.length) {
        let i = 0;
        while (i < newValue.length) {
          if (newValue !== oldValue[i]) {
            break;
          }
          i++;
        }
        /* Arrays equal? Nothing to do */
        if (i === newValue.length) {
          return;
        }
      }
      this.$store.commit('race/fleet/setHover', newValue);
    }
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
