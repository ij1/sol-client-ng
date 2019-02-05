<template>
  <l-layer-group v-if = "this.$store.state.boat.id !== null">
    <l-marker
      :latLng="this.$store.state.boat.position"
      :icon="myBoatIcon"
    />
    <boat-trace :id = "this.$store.state.boat.id"/>
  </l-layer-group>
</template>

<script>
import L from 'leaflet'
import { LLayerGroup, LMarker, LPolyline } from 'vue2-leaflet'
import { radToDeg } from '../../lib/utils.js';
import { boatPath, sailPath, sailAngle } from '../../lib/boatshape.js';
import BoatTrace from './trace.vue';

export default {
  name: 'PlayerBoat',
  components: {
    'l-layer-group': LLayerGroup,
    'l-marker': LMarker,
    'l-polyline': LPolyline,
    'boat-trace': BoatTrace,
  },
  props: {
    course: {
      type: Number,
      required: true,
    },
    twa: {
      type: Number,
      required: true,
    },
    color: {
      type: String,
      default: '#ff00ff',
    },
    scale: {
      type: Number,
      default: 1,
    },
    strokeWidth: {
      type: Number,
      default: 2,
    },
  },
  computed: {
    boatCourse () {
      return radToDeg(this.course);
    },
    boatTwa () {
      return radToDeg(this.twa);
    },
    iconCenter () {
      return 20 * this.scale;
    },
    iconSize () {
      return this.iconCenter * 2 + 1;
    },
    boatPath () {
      return boatPath(this.scale);
    },
    sailAngle () {
      return sailAngle(this.boatTwa);
    },
    sailPath () {
      return sailPath(this.sailAngle, this.scale);
    },
    style () {
      return "fill='none' stroke-opacity='1' stroke-width='" +
             this.strokeWidth + "' stroke='" + this.color + "'";
    },
    myBoatIcon() {
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" +
                  this.iconSize + "px' height='" +
                  this.iconSize + "px'>" +
        "<g transform='translate(" + this.iconCenter + "," + this.iconCenter +
                      ") rotate(" + this.boatCourse +
                      ")' " + this.style + ">" +
        "<path d='" + this.boatPath + "'/>" +
          "<g transform='translate(0, " + (-6 * this.scale) + ") rotate(" + this.sailAngle +
          ")'><path d='" + this.sailPath + "'/>" +
        "</g></g></svg>";
      const iconUrl = 'data:image/svg+xml;base64,' + btoa(svg);
      return L.icon({
        iconUrl: iconUrl,
        iconAnchor: [this.iconCenter, this.iconCenter],
      });
    },
  },
}
</script>
