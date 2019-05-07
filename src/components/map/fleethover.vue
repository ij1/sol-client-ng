<script>
import { mapState } from 'vuex';

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
    ...mapState({
      hoverLatLng: state => state.map.hoverLatLng,
      fleetTime: state => state.race.fleet.fleetTime,
      zoom: state => state.map.zoom,
    }),
  },
  mounted () {
    this.updateHover();
  },
  methods: {
    updateHover () {
      if (this.hoverLatLng === null) {
        if (this.hoverList.length > 0) {
          this.hoverList = [];
        }
        return;
      }

      let res;
      for (let distance = 3; distance < 7; distance++) {
        res = this.$store.getters['race/fleet/searchAt'](this.hoverLatLng, this.zoom, distance);
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
    hoverLatLng () {
      this.updateHover();
    },
    fleetTime () {
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
