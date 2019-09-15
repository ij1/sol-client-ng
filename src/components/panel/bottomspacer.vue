<template>
  <div id = "bottom-spacer" :style = "{height: bottomSpacerSize}"/>
</template>

<script>
export default {
  name: 'BottomSpacer',
  computed: {
    bottomSpacerSize () {
      const userAgent = window.navigator.userAgent.toLowerCase();

      if (/ipad/.test(userAgent)) {
        return '12px';
      }
      return '0';
    },
  },
}
</script>
