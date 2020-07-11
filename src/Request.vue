<script>
import Vue from 'vue';
import { mapState, mapMutations } from 'vuex';
import { formatDateTime } from './utility';

export default Vue.extend({
  props: {
    req: Object,
  },
  computed: mapState([
    'markers',
    'selectedTraceId',
  ]),
  methods: mapMutations([
    'selectTraceId',
  ]),
  render() {
    const { $style: s, req } = this;
    return (
      <pre
        class={{
          [s.request]: 1,
          [s.active]: this.selectedTraceId === req.traceId,
          [s.markered]: this.markers.includes(req.traceId),
        }}
      >
        <div
          class={s.header}
          vOn:click={() => this.selectTraceId(req.traceId)}
        >
          {`${formatDateTime(req.timestamp)} ${req.method} ${req.url}`}
        </div>

        {this.selectedTraceId === req.traceId ? JSON.stringify(req, null, 2) : ''}
      </pre>
    );
  },
});
</script>

<style module lang="scss">
.request {
  cursor: pointer;
  margin: 0;

  .header {
    padding: 5px;
  }
  .header:hover {
    background: var(--request-background);
  }
}
.markered {
  border-top: solid 3px red;
}
.active {
  background: var(--request-active-background) !important;
}
</style>
