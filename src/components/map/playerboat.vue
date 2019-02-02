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

  computed: {
    boatCourse () {
      return radToDeg(this.$store.state.boat.instruments.course.value);
    },
    iconCenter () {
      return 18;
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
    myBoatIcon() {
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" +
                  this.iconSize + "px' height='" +
                  this.iconSize + "px'>" +
        "<g transform='translate(" + this.iconCenter + "," + this.iconCenter +
                      ") rotate(" + this.boatCourse +
                      ")'  fill='none' stroke-opacity='1' stroke-width='2' stroke='#ff00ff'>" +
        "<path d='" + this.boatPath + "'/></g></svg>";
      const iconUrl = 'data:image/svg+xml;base64,' + btoa(svg);
      return L.icon({
        iconUrl: iconUrl,
        iconAnchor: [this.iconCenter, this.iconCenter],
      });
    },
  },
  methods: {
    pathPos(x, y) {
      return x + " " + y;
    },
  },
}
</script>
