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
        v-for = "boat in this.hoverBoatList"
        :key = "boat.id"
      >
        <div
          class = "color-floated"
          :style = "{ background: boatColor(boat) }"
        />
        {{boat.ranking}} {{boat.country}} {{ boat.name }} ({{ boat.type}})
      </div>
      <div v-if = "this.countNonExpandedBoats > 0">
        +{{this.countNonExpandedBoats}} boats
      </div>
    </div>
  </l-control>
</template>

<script>
import { mapGetters } from 'vuex';
import { LControl } from 'vue2-leaflet'

export default {
  name: 'FleetHover',
  components: {
    'l-control': LControl,
  },
  props: {
    map: {
      type: Object,
      required: true,
    },
    hoverLatLng: {
      type: Object,
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
        res = this.$store.getters['race/fleet/searchAt'](this.hoverLatLng, this.$parent.$parent.zoom, distance);
        if (res.length > 0) {
          break;
        }
      }

      let self = this;
      return res.sort((a, b) => {
        const aa = self.fleetBoatFromId(a.id).ranking;
        const bb = self.fleetBoatFromId(b.id).ranking;
        return aa - bb;
      }).map(i => i.id);
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
}
#fleet-info {
  text-align: left;
}
.color-floated {
  float: left;
  width: 12px;
  height: 12px;
  margin-top: 4px;
  margin-right: 4px;
}
</style>
