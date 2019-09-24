<template>
  <span>
    {{ lngFormatted }}
  </span>
</template>

<script>
import { coordinateMixin } from './mixins/coordinate.js';

export default {
  name: 'LonCoordinate',
  mixins: [ coordinateMixin ],
}
</script>
