import { mapState } from 'vuex';
import { formatCoordinate } from '../../lib/format.js';

const snHemispheres = ['S', 'N'];
const weHemispheres = ['W', 'E'];

export let coordinateMixin = {
  props: {
    latLng: {
      type: Object,
    }
  },
  computed: {
    precision () {
      return 5;
    },
    latFormatted () {
      if ((typeof this.latLng === 'undefined') || (this.latLng === null)) {
        return '';
      }
      return formatCoordinate(this.latLng.lat, snHemispheres,
                              this.precision, this.coordinateFormat);
    },
    lngFormatted () {
      if ((typeof this.latLng === 'undefined') || (this.latLng === null)) {
        return '';
      }
      return formatCoordinate(this.latLng.lng, weHemispheres,
                              this.precision, this.coordinateFormat);
    },
    ...mapState({
      coordinateFormat: state => state.ui.cfg.coordinateFormat.value,
    }),
  },
}
