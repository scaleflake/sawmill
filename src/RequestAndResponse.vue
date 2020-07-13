<script>
import lo from 'lodash';
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
    'highlightedTraceId',
  ]),
  methods: mapMutations([
    'selectTraceId',
    'highlightTraceId',
  ]),

  render() {
    const { $style: s, req } = this;
    const { response: res } = req;

    return (
      <pre
        class={{
          [s.request]: 1,

          [s.markered]: this.markers.includes(req.traceId),
        }}
      >
        <div
          class={{
            [s.header]: true,
            [s.selected]: this.selectedTraceId === req.traceId,
            [s.highlighted]: this.highlightedTraceId === req.traceId,
          }}
          vOn:click={() => this.selectTraceId(req.traceId)}
          vOn:mouseover={() => this.highlightTraceId(req.traceId)}
          vOn:mouseout={() => this.highlightTraceId(null)}
        >
          <div class={s.req}>
            {`${formatDateTime(req.timestamp)} ${req.method} ${req.url} ${
              ['/rpc', '/rpc/'].includes(req.url) ? `[${req.body.method}]` : ''
            }`}
          </div>
          {res ? (
            <div class={{
              [s.res]: true,
              [s.from400to499]: res.status >= 400 && res.status < 500,
              [s.from300to399]: res.status >= 300 && res.status < 400,
              [s.from200to299]: res.status >= 200 && res.status < 300,
            }}>
              {`${req.response.status} ${req.response.timestamp - req.timestamp}ms`}
            </div>
          ) : null}
        </div>

        {this.selectedTraceId === req.traceId ? (
          <div class={s.body}>
            {`REQUEST: ${JSON.stringify(lo.omit(req, 'response'), null, 2)}\n`}
            <div style={{ background: '#e1dffa' }}>
              {`RESPONSE: ${JSON.stringify(req.response, null, 2)}`}
            </div>
          </div>
        ) : null}
      </pre>
    );
  },
});
</script>

<style module lang="scss">
.request {
  cursor: pointer;
  margin: 0;
  width: 100%;
  overflow: hidden;
  background: var(--request-background);

  .header {
    /* padding: 5px; */
    display: flex;
    background: white;

    .req {
      padding: 5px;
      flex-grow: 1;
      width: calc(100% - 120px);
      overflow-x: scroll;

      &::-webkit-scrollbar {
        display: none;
      }
    }
    .res {
      padding: 5px;
      text-align: center;
      width: 100px;
    }
    .res.from200to299 {
      background-color: #bbffaa;
    }
    .res.from300to399 {
      background-color: #aaffdd;
    }
    .res.from400to499 {
      background-color: orange;
    }
  }
  .selected {
    background: var(--request-selected-background) !important;
  }
  .header:hover,
  .header.highlighted {
    background: var(--request-highlighted-background) !important;
  }
}
.markered {
  border-top: solid 3px red;
}

.body {
  overflow-wrap: break-word;
  overflow-x: scroll;
}
</style>
