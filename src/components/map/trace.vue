<template>
  <l-layer-group>
    <l-polyline
      :lat-lngs = "this.boatTrace"
      :color = "this.color"
      :weight = "1"
      :fill = "false"
    />
    <l-polyline
      :lat-lngs = "this.lastMileTrace"
      :color = "this.color"
      :weight = "1"
      :fill = "false"
    />
  </l-layer-group>
</template>

<script>
import { mapGetters } from 'vuex';
import { LLayerGroup, LPolyline } from 'vue2-leaflet'
import { latLngAddOffset } from '../../lib/utils.js';

export default {
  name: 'BoatTrace',
  components: {
    'l-layer-group': LLayerGroup,
    'l-polyline': LPolyline,
  },

  props: {
    id: {
      type: String,
      required: true,
    },
    lngOffset: {
      type: Number,
      default: 0,
    },
  },

  computed: {
    boat () {
      return this.fleetBoatFromId(this.id);
    },
    boatTrace () {
      if (this.lngOffset === 0) {
        return this.boat.trace;
      } else {
        return this.boat.trace.map(i => latLngAddOffset(i, this.lngOffset));
      }
    },
    isPlayerBoat () {
      return this.id === this.$store.state.boat.id;
    },
    color () {
      return this.boatColor(this.boat);
    },
    lastMileTrace () {
      if (this.boat.trace.length === 0) {
        return [];
      }

      let res = [
        this.boat.trace[0],
        this.$store.getters['race/latLngToRaceBounds'](this.boat.latLng)
      ];

      /* Own boat extends beyond the fleet update 
       * FIXME: perhaps run dead-reckoning for the whole fleet, then this
       * can be removed.
       */
      if (this.isPlayerBoat) {
        res.push(this.$store.getters['race/latLngToRaceBounds'](
          this.$store.state.boat.position
        ));
      }

      if (this.lngOffset === 0) {
        return res;
      } else {
        return res.map(i => latLngAddOffset(i, this.lngOffset));
      }
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      boatColor: 'race/fleet/boatColor',
    }),
  },
}
</script>
