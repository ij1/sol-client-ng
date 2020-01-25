<template>
  <div id = "bottom-spacer" :style = "{height: bottomSpacerSize}"/>
</template>

<script>
import L from 'leaflet';

export default {
  name: 'BottomSpacer',
  computed: {
    bottomSpacerSize () {
      const userAgent = window.navigator.userAgent.toLowerCase();

      if ((/ipad/.test(userAgent)) ||
          (/safari/.test(userAgent) && L.Browser.mobile)) {
        return '12px';
      }
      return '0';
    },
  },
}
</script>
