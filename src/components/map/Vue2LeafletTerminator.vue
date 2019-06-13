<script>
import L from 'leaflet';
import { PolygonMixin, optionsMerger, findRealParent, propsBinder } from 'vue2-leaflet';
import terminator from '@joergdietrich/leaflet.terminator';

const props = {
  resolution: {
    type: Number,
    default: 2,
  },
  time: {
    type: [Number, String, Array],
    custom: true,
    default: null,
  },
};

export default {
  name: 'l-terminator',
  mixins: [PolygonMixin],
  props,
  data () {
    return {
      ready: false,
    }
  },
  mounted () {
    const options = optionsMerger(this.polygonOptions, this);
    this.mapObject = terminator(options);
    L.DomEvent.on(this.mapObject, this.$listeners);
    propsBinder(this, this.mapObject, props);
    this.ready = true;
    this.parentContainer = findRealParent(this.$parent);
    this.parentContainer.addLayer(this, !this.visible);
  },
  beforeDestroy () {
    this.parentContainer.removeLayer(this);
  },
  render () {
    return null;
  },
  methods: {
    setTime (newVal) {
      this.mapObject.setTime(newVal);
    },
  },
}

</script>
