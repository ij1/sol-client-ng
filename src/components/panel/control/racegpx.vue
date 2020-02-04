<template>
  <a>Race GPX file</a>
</template>

<script>
import { mapState } from 'vuex';
import GPX from 'gpx-parser-builder';

export default {
  computed: {
    markGpx () {
      return new GPX({
        $: {
          creator: 'Sailonline.org client',
        },
        wpt: this.raceRoute.map(wp => {
          return {
            $: {
              lat: wp.latLng.lat,
              lon: wp.latLng.lng,
            },
            name: wp.name
          }
        }).concat(this.raceFinish.map((wp, idx) => {
          return {
            $: {
              lat: wp.lat,
              lon: wp.lng,
            },
            name: 'Finish ' + (idx === 0 ? 'A' : 'B'),
          }
        })),
        rte: {
          name: this.raceName,
          rtept: this.raceRoute.map(wp => {
            return {
              $: {
                lat: wp.latLng.lat,
                lon: wp.latLng.lng,
              },
              name: wp.name
            }
          }).concat(this.raceFinish.map((wp, idx) => {
            return {
              $: {
                lat: wp.lat,
                lon: wp.lng,
              },
              name: 'Finish ' + (idx === 0 ? 'A' : 'B'),
            }
          })),
        },
      });
    },
    markFile () {
      return this.markGpx.toString();
    },
    linkHref () {
      const blob = new Blob([this.markFile], {
        type: 'text/xml;charset=utf-8',
      });
      return URL.createObjectURL(blob);
    },
    linkFilename () {
      return 'race_' + this.raceId + '.gpx';
    },
    ...mapState({
      raceName: state => state.race.info.name,
      raceId: state => state.race.info.id,
      raceRoute: state => state.race.route,
      raceFinish: state => state.race.finish,
    }),
  },
  mounted () {
    this.$el.href = this.linkHref;
    this.$el.download = this.linkFilename;
  }
}
</script>
