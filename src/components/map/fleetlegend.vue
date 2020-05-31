<template>
  <l-control
    id = "legend-info-ctrl"
    :position = "'bottomleft'"
  >
    <div
      v-if = "showLegend && combinedIds.length > 0"
      id = "legend-info"
      ref = "legend-info"
    >
      <div
        class = "legend-row"
        v-for = "boat in legendBoats"
        :key = "boat.id"
        :class = "{ 'legend-hover': typeof hoverObj[boat.id] !== 'undefined' }"
        @click.stop.prevent = "highlightBoat($event, boat.id)"
        @touchstart.stop.prevent = "highlightBoat($event, boat.id)"
        @touchend.stop.prevent
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
import L from 'leaflet';
import { mapGetters, mapState } from 'vuex';
import { EventBus } from '../../lib/event-bus.js';
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
  computed: {
    showLegend () {
      return this.cfgKeys === 'corner' || this.cfgKeys === 'both';
    },
    legendBoats () {
      if (this.showLegend) {
        return this.showIds.map(id => this.fleetBoatFromId(id));
      }
      return [];
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
      hoverObj: state => state.race.fleet.hover,
      cfgKeys: state => state.map.cfg.boatKeys.value,
    }),
  },
  updated () {
    if (typeof this.$refs['legend-info'] !== 'undefined') {
      L.DomEvent.disableClickPropagation(this.$refs['legend-info']);
    }
  },
  methods: {
    highlightBoat (e, boatId) {
      EventBus.$emit('map-highlight', {
        boatId: boatId,
        keepMapPosition: e.altKey,
      });
    },
  },
}
</script>

<style scoped>
#legend-info-ctrl {
  pointer-events: none;
  margin: 2px;
}
.time-of-day-white #legend-info-ctrl {
  color: #000;
  background: rgba(200, 200, 200, 0.6);
}
.time-of-day-dark #legend-info-ctrl {
  color: #0f0;
  background: rgba(60, 60, 60, 0.8);
}
#legend-info {
  text-align: left;
  margin: 2px;
  font-size: 11px;
}
.legend-row {
  margin: 1px;
  pointer-events: auto;
}
.legend-hover {
  background-color: rgba(60, 60, 255, 0.25);
}
.color-block {
  display: inline-block;
  width: 12px;
  min-width: 12px;
  height: 12px;
}
.boat-ranking, .boat-name {
  margin: 2px;
  font-weight: bold;
}
</style>
