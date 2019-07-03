<template>
  <div v-if = "boatSyc === false">
    <div id = "join-bg">
      <div id = "join-blinker"/>
      <a
        id = "banner"
        href = "http://www.sailonline.org/blog/2008/mar/10/sailonline-yacht-club-launched/"
        target = "_blank"
      >
        <img src="images/joinsyc.png">
      </a>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'SycBanner',
  computed: {
    boatSyc () {
      const boat = this.boatFromId(this.boatId);
      if (typeof boat !== 'undefined') {
        return boat.syc;
      }
      return null;
    },
    ...mapState({
      boatId: state => state.boat.id,
    }),
    ...mapGetters({
      boatFromId: 'race/fleet/boatFromId',
    }),
  },
}
</script>

<style scoped>
#join-bg {
  padding-top: 20px;
  padding-bottom: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
#join-blinker {
  position: absolute;
  top: 0px;
  bottom: 0px;
  left: 0px;
  right: 0px;
  background-image: radial-gradient(ellipse at center,
                                    #4080e0 10%,
                                    #60a0e0 45%,
                                    transparent 70%);
  animation: blinker 4s linear infinite;
}
@keyframes blinker {
  50% {
    opacity: 0;
  }
}
#banner {
  position: relative;
  z-index: 2;
}
</style>
