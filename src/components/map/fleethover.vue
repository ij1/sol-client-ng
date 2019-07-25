<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'FleetHover',
  data () {
    return {
      hoverList: [],
    }
  },
  computed: {
    hoverIdsObject () {
      return this.hoverList.reduce((obj, i) => {
        obj['' + i] = true;
        return obj;
      }, {});
    },
    filterNeedsUpdate () {
      return this.currentFilter !== null ? this.currentFilter.filterStamp : null;
    },
    ...mapState({
      fleetTime: state => state.race.fleet.fleetTime,
      zoom: state => state.map.zoom,
    }),
    ...mapGetters({
      wrappedHoverLatLng: 'map/wrappedHoverLatLng',
      currentFilter: 'ui/boatlists/currentFilter',
      applyFilterToBoat: 'ui/boatlists/applyFilterToBoat',
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
  },
  mounted () {
    this.updateHover();
  },
  methods: {
    updateHover () {
      if (this.wrappedHoverLatLng === null) {
        if (this.hoverList.length > 0) {
          this.hoverList = [];
        }
        return;
      }

      let res;
      for (let distance = 3; distance < 7; distance++) {
        res = this.$store.getters['race/fleet/searchAt'](this.wrappedHoverLatLng, this.zoom, distance);

        if (this.currentFilter !== null) {
          res = res.filter(i => this.applyFilterToBoat(this.fleetBoatFromId(i.id)));
        }
        if (res.length > 0) {
          break;
        }
      }

      if (res.length === 0) {
        if (this.hoverList.length > 0) {
          this.hoverList = [];
        }
        return;
      }

      this.hoverList = res.map(i => i.id);
    },
  },
  watch: {
    hoverIdsObject (newValue) {
      this.$store.commit('race/fleet/setHover', newValue);
    },
    wrappedHoverLatLng () {
      this.updateHover();
    },
    fleetTime () {
      this.updateHover();
    },
    filterNeedsUpdate () {
      this.updateHover();
    },
  },
  render () {
    return null;
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
