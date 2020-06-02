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
    const { res } = this;
    return (
      <pre
        class={
          this.selectedTraceId === res.traceId
            ? 'response response--active'
            : 'response'
        }
        vOn:click={() => this.selectTraceId(res.traceId)}
      >{
        this.selectedTraceId === res.traceId
          ? JSON.stringify(res, null, 2)
          : JSON.stringify(res, null, 2).split('\n').slice(0, 6).concat(['...'])
            .join('\n')
      }</pre>
    );
  },
});
