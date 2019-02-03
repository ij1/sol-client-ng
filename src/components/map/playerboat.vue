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
      return  'M ' + this.pathPos(-3, 11) +
             ' C ' + this.pathPos(-5, -1) + ',' + this.pathPos(-6, 9) + ',' + this.pathPos(0, -13) +
             ' C ' + this.pathPos(6, 9) + ',' + this.pathPos(5, -1) + ',' + this.pathPos(3, 11) +
             ' Z';
    },
    sailAngle () {
      /* FIXME:
       * perhaps some AWA based calculation could result in a better angle
       * maxvmg angle should be consider especially for headwind
       */
      return this.boatTwa / (180 / 75);
    },
    sailPath () {
      const curvePar = Math.sign(this.sailAngle) * -3 * this.scale;
      return 'M 0 0 ' +
             'C ' + curvePar + ' ' + (5 * this.scale) +
                    ', ' + curvePar + ' ' + (12 * this.scale) +
                    ', 0 ' + (17 * this.scale);
    },
    myBoatIcon() {
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" +
                  this.iconSize + "px' height='" +
                  this.iconSize + "px'>" +
        "<g transform='translate(" + this.iconCenter + "," + this.iconCenter +
                      ") rotate(" + this.boatCourse +
                      ")'  fill='none' stroke-opacity='1' stroke-width='" + this.strokeWidth + "' stroke='" + this.color + "'>" +
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
  methods: {
    pathPos(x, y) {
      return (x * this.scale) + " " + (y * this.scale);
    },
  },
}
</script>
