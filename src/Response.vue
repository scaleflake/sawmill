<script>
import Vue from 'vue';
import { mapState, mapMutations } from 'vuex';

export default Vue.extend({
  props: {
    res: Object,
  },
  computed: mapState([
    'selectedTraceId',
    'markers',
  ]),
  methods: mapMutations([
    'selectTraceId',
  ]),
  render() {
    const { $style: s, res } = this;
    return (
      <pre
        class={{
          [s.response]: 1,
          [s.active]: this.selectedTraceId === res.traceId,
          [s.markered]: this.markers.includes(res.traceId),
        }}
      >
        <div
          class={s.header}
          vOn:click={() => this.selectTraceId(res.traceId)}
        >{
          res.status
        }</div>
        {this.selectedTraceId === res.traceId ? JSON.stringify(res, null, 2) : ''}
      </pre>
    );
  },
});
</script>

<style module lang="scss">
.response {
  cursor: pointer;
  margin: 0;

  .header {
    padding: 5px;
  }
  .header:hover {
    background: lightsteelblue;
  }
}
.markered {
  border-top: solid 3px red;
}
.active {
  background: lightblue !important;
}
</style>
