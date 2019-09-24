<template>
  <span>
    {{ latFormatted }}
  </span>
</template>

<script>
import { coordinateMixin } from './mixins/coordinate.js';

export default {
  name: 'LatCoordinate',
  mixins: [ coordinateMixin ],
}
</script>
