<template>
  <div class="flag-container">
    <img
      v-if = "valid"
      :src="flagUrl"
    />
  </div>
</template>

<script>
import { validCountries } from '../lib/country.js';

export default {
  name: 'CountryFlag',
  props: {
    country: {
      type: String,
    },
  },
  computed: {
    valid () {
      return (typeof this.country !== 'undefined') &&
             (this.country !== null) &&
             (typeof validCountries[this.country.toLowerCase()] !== 'undefined');
    },
    flagImage () {
      if (!this.valid) {
        return '';
      }
      return this.country.toLowerCase();
    },
    flagUrl () {
      return 'flags/' + this.flagImage + '.png';
    }
  },
}
</script>

<style>
.flag-container {
  display: inline-block;
  width: 16px;
  height: 11px;
}
</style>
