import Vue from 'vue';
import { mapState, mapMutations } from 'vuex';

export default Vue.extend({
  props: {
    res: Object,
  },
  computed: mapState([
    'selectedTraceId',
  ]),
  methods: mapMutations([
    'selectTraceId',
  ]),
  render() {
    return (
      <pre
        class={
          this.selectedTraceId === this.res.traceId
            ? 'response response--active'
            : 'response'
        }
        vOn:click={() => this.selectTraceId(this.res.traceId)}
      >{JSON.stringify(this.res, null, 2)}</pre>
    );
  },
});
