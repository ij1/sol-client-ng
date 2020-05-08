<template>
  <div id="wind-key">
    <div
      v-for = "wind in windKeys"
      v-bind:key = "wind"
    >
      <span
        class = "wind-key-line"
        :style = "{background: windToColor(wind)}"
      />
      {{ wind }} kn
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { windToColor} from '../../../lib/sol.js';

export default {
  name: 'WindKey',
  computed: {
    ...mapGetters({
      windKeys: 'boat/polar/windKeys',
    }),
  },
  methods: {
    windToColor(knots) {
      return windToColor(knots);
    },
  },
}
</script>

<style scoped>
#wind-key {
  position: relative;
  top: 0px;
  right: 0px;
}
.wind-key-line {
  position: relative;
  left: 0px;
  top: -2px;
  display: inline-block;
  height: 5px;
  border-radius: 3px;
  width: 15px;
}
</style>
