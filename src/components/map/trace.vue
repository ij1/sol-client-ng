<template>
  <l-layer-group v-if = "isPlayerBoat || !isPracticeMark">
    <l-polyline
      v-for = "offset in mapWrapList"
      :key = "'t' + offset"
      :lat-lngs = "latLngArrayAddOffset(boatTrace, offset)"
      :color = "color"
      :weight = "1"
      :fill = "false"
    />
    <l-polyline
      v-for = "offset in mapWrapList"
      :key = "'lt' + offset"
      :lat-lngs = "latLngArrayAddOffset(lastMileTrace, offset)"
      :color = "color"
      :weight = "1"
      :fill = "false"
    />
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup, LPolyline } from 'vue2-leaflet';
import { latLngArrayAddOffset } from '../../lib/utils.js';

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
      return this.fleetBoatFromId(this.id);
    },
    boatTrace () {
      return this.boat.trace;
    },
    isPlayerBoat () {
      return this.id === this.$store.state.boat.id;
    },
    isPracticeMark () {
      return this.boat.name.startsWith('Practice_Mark');
    },
    color () {
      if (this.isPlayerBoat && this.cfgOwnBoatColor === 'magenta') {
        return '#ff00ff';
      }
      return this.boatColor(this.boat);
    },
    lastMileTrace () {
      if (this.boat.trace.length === 0) {
        return [];
      }

      let res = [
        this.boat.trace[this.boat.trace.length - 1],
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

      return res;
    },
    ...mapState({
      mapWrapList: state => state.map.wrapList,
      cfgOwnBoatColor: state => state.map.cfg.ownBoatColor.value,
    }),
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
      boatColor: 'race/fleet/boatColor',
    }),
  },
  methods: {
    latLngArrayAddOffset,
  },
}
</script>
