<script>
import { mapState, mapGetters } from 'vuex';
import { ownBoatVisibleFilter } from '../../lib/sol.js';

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
      searchTreeStamp: state => state.race.fleet.searchTreeStamp,
      zoom: state => state.map.zoom,
      ownBoatId: state => state.boat.id,
    }),
    ...mapGetters({
      wrappedHoverLatLng: 'map/wrappedHoverLatLng',
      currentFilter: 'ui/boatlists/currentFilter',
      applyFilterToBoat: 'ui/boatlists/applyFilterToBoat',
      fleetBoatFromId: 'race/fleet/boatFromId',
      selectedFiltered: 'race/fleet/selectedFiltered',
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
          res = res.filter(i => {
            return this.applyFilterToBoat(this.fleetBoatFromId(i.id)) &&
                   (i.id !== this.ownBoatId ||
                    ownBoatVisibleFilter(this.$store, i.lat, i.lng));
          });
        } else {
          res = res.filter(i => {
            return i.id !== this.ownBoatId ||
                   ownBoatVisibleFilter(this.$store, i.lat, i.lng);
          });
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
    searchTreeStamp () {
      this.updateHover();
    },
    selectedFiltered () {
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
