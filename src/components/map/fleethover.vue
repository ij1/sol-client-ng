<script>
import { mapState } from 'vuex';

export default {
  name: 'FleetHover',
  computed: {
    hoverList () {
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

      return res.map(i => i.id);
    },
    hoverIdsObject () {
      return this.hoverList.reduce((obj, i) => {
        obj['' + i] = true;
        return obj;
      }, {});
    },
    ...mapState({
      hoverLatLng: state => state.map.hoverLatLng,
      zoom: state => state.map.zoom,
    }),
  },
  watch: {
    hoverIdsObject (newValue) {
      this.$store.commit('race/fleet/setHover', newValue);
    }
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
