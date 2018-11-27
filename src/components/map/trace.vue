<template>
  <l-layer-group>
    <l-polyline
      :latLngs = "this.boatTrace"
      :color = "this.color"
      :weight = "1"
      :fill = "false"
    />
    <l-polyline
      :latLngs = "this.lastMileTrace"
      :color = "this.color"
      :weight = "1"
      :fill = "false"
    />
  </l-layer-group>
</template>

<script>
import { LLayerGroup, LPolyline } from 'vue2-leaflet'

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
  },

  computed: {
    boat () {
      const idx = this.$store.state.race.fleet.id2idx[this.id];
      return this.$store.state.race.fleet.boat[idx];
    },
    boatTrace () {
      return this.boat.trace;
    },
    isPlayerBoat () {
      return this.id === this.$store.state.boat.id;
    },
    color () {
      return 'rgb(' + this.boat.color.r + ',' + this.boat.color.g + ',' + this.boat.color.b + ')';
    },
    lastMileTrace () {
      if (this.boat.trace.length === 0) {
        return [];
      }

      let res = [this.boat.trace[0],
                 this.boat.latLng];

      /* Own boat extends beyond the fleet update 
       * FIXME: perhaps run dead-reckoning for the whole fleet, then this
       * can be removed.
       */
      if (this.isPlayerBoat) {
        res.push(this.$store.state.boat.position);
      }
      return res;
    },
  },
}
</script>
