<template>
  <l-layer-group>
    <l-circle-marker
      v-for = "boat in legendBoats"
      :key = "boat.id"
      :lat-lng = "boat.latLng"
      :radius = "0"
      :stroke = "false"
    >
      <l-tooltip
        :options = "boatnameTipOptions"
        class = "legend-row"
      >
        <span class = "boat-ranking">{{boat.ranking}}</span>
        <country-flag :country = "boat.country"/>
        <syc-flag :syc = "boat.syc"/>
        <span class = "boat-name">{{ boat.name }}</span>
        <span v-if="multiClassRace">
          ({{ boat.type}})
        </span>
      </l-tooltip>
    </l-circle-marker>
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup, LCircleMarker, LTooltip } from 'vue2-leaflet';
import CountryFlag from '../countryflag.vue';
import SycFlag from '../sycflag.vue';

export default {
  name: 'BoatnameTips',
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle-marker': LCircleMarker,
    'l-tooltip': LTooltip,
    'country-flag': CountryFlag,
    'syc-flag': SycFlag,
  },
  data () {
    return {
      boatnameTipOptions: {
        permanent: true,
        direction: 'right',
        className: 'bname-tooltip',
      },
    }
  },
  computed: {
    showLegend () {
      return this.cfgKeys === 'map' || this.cfgKeys === 'both';
    },
    legendBoats () {
      if (this.showLegend) {
        return this.showIds.map(id => this.fleetBoatFromId(id));
      }
      return [];
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      multiClassRace: 'race/fleet/multiClassRace',
      showIds: 'race/fleet/showIds',
    }),
    ...mapState({
      cfgKeys: state => state.map.cfg.boatKeys.value,
    }),
  },
}
</script>

<style scoped>
.time-of-day-white .legend-row {
  color: #000;
  background: rgba(200, 200, 200, 0.6);
}
.time-of-day-dark .legend-row {
  color: #0f0;
  background: rgba(60, 60, 60, 0.8);
}
.legend-row {
  margin: 1px;
  pointer-events: none;
}
.legend-hover {
  background-color: rgba(60, 60, 255, 0.25);
}
.boat-ranking, .boat-name {
  margin: 2px;
  font-weight: bold;
}
</style>

<style>
.bname-tooltip {
  background: transparent !important;
  border: 0px !important;
  padding: 0px !important;
  padding-left: 8px !important;
  box-shadow: unset !important;
  text-align: left !important;
  pointer-events: none !important;
}

.bname-tooltip::before {
  all: unset !important;
}
</style>
