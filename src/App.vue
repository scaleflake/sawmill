<template>
<div class="wrapper">
  <div
    class="requests"
    ref="requests"
    :style="{ 'border-top': requestsScrolledToTop ? 'solid 15px #89ff9a': 'solid 15px white' }"
  >
    <pre
      v-for='req in requests'
      class='request'
      :key="req.traceId"
      :class="{ 'request--active': selectedTraceId === req.traceId }"
      @click="() => selectTraceId(req.traceId)"
    >
      {{
        selectedTraceId === req.traceId
          ? JSON.stringify(req, null, 2)
          : JSON.stringify(req, null, 2).split(`\n`).slice(0, 6).concat([`...`]).join(`\n`)
      }}
    </pre>
    <InfiniteLoading @infinite="fetchNextRequestsPage" />
  </div>
  <div class="responses"
    ref="responses"
    :style="{ 'border-top': responsesScrolledToTop ? 'solid 15px #89ff9a': 'solid 15px white' }"
  >
    <Request
      v-for='res in responses'
      :key='res.id'
      :res='res'
    />
    <InfiniteLoading @infinite="fetchNextResponsesPage" />
  </div>
</div>
</template>

<script>
import axios from 'axios';
import InfiniteLoading from 'vue-infinite-loading';
import { mapMutations, mapState } from 'vuex';
import Request from './Request';

axios.defaults.baseURL = process.env.VUE_APP_REST_API_BASE_URL || 'http://localhost:14080/logger';

// NOTE: taken from vue-infinite-loading
const scrollBarStorage = {
  key: '_infiniteScrollHeight',
  getScrollElm(elm) {
    return elm === window ? document.documentElement : elm;
  },
  save(elm) {
    const target = this.getScrollElm(elm);

    // save scroll height on the scroll parent
    target[this.key] = target.scrollHeight;
  },
  restore(elm) {
    const target = this.getScrollElm(elm);

    /* istanbul ignore else */
    if (typeof target[this.key] === 'number') {
      target.scrollTop = target.scrollHeight - target[this.key] + target.scrollTop;
    }

    this.remove(target);
  },
  remove(elm) {
    if (elm[this.key] !== undefined) {
      // remove scroll height
      delete elm[this.key]; // eslint-disable-line no-param-reassign
    }
  },
};


export default {
  components: {
    Request,
    InfiniteLoading,
  },
  data() {
    return {
      requestsScrolledToTop: false,
      responsesScrolledToTop: false,
    };
  },
  async created() {
    const baseUrl = process.env.VUE_APP_WS_API_BASE_URL || 'ws://localhost:14080/logger';

    const ws = new WebSocket(`${baseUrl}/ws`);
    ws.onmessage = message => {
      for (const { event, data } of JSON.parse(message.data)) {
        switch (event) {
          case 'request':
            if (this.requestsScrolledToTop) {
              this.unshiftRequests([data]);
            } else {
              this.pushRequestsToBuffer([data]);
            }
            break;
          case 'response':
            if (this.responsesScrolledToTop) {
              this.unshiftResponses([data]);
            } else {
              this.pushResponsesToBuffer([data]);
            }
            break;
          default:
            break;
        }
      }
    };
  },
  async mounted() {
    this.requestsScrolledToTop = this.$refs.requests.scrollTop === 0;
    this.$refs.requests.addEventListener('scroll', event => {
      this.requestsScrolledToTop = event.target.scrollTop < 35;
    });

    this.responsesScrolledToTop = this.$refs.responses.scrollTop === 0;
    this.$refs.responses.addEventListener('scroll', event => {
      this.responsesScrolledToTop = event.target.scrollTop < 35;
    });
  },
  watch: {
    requestsScrolledToTop(newV) {
      if (newV) {
        scrollBarStorage.save(this.$refs.requests);
        this.extractRequestsFromBuffer();
        requestAnimationFrame(() => {
          scrollBarStorage.restore(this.$refs.requests);
        });
      }
    },
    responsesScrolledToTop(newV) {
      if (newV) {
        scrollBarStorage.save(this.$refs.responses);
        this.extractResponsesFromBuffer();
        requestAnimationFrame(() => {
          scrollBarStorage.restore(this.$refs.responses);
        });
      }
    },
  },
  computed: {
    ...mapState([
      'requests',
      'requestsBuffer',
      'responses',
      'responsesBuffer',
      'selectedTraceId',
    ]),
  },
  methods: {
    ...mapMutations([
      'selectTraceId',
      'pushRequests',
      'pushRequestsToBuffer',
      'extractRequestsFromBuffer',
      'pushResponses',
      'pushResponsesToBuffer',
      'extractResponsesFromBuffer',
      'unshiftRequests',
      'unshiftResponses',
    ]),
    async fetchNextRequestsPage(state) {
      const lastTimestamp = this.requests[this.requests.length - 1]?.timestamp;
      const { data } = await axios.get('/requests', {
        params: {
          $sort: '-timestamp',
          $limit: '5',
          ...(lastTimestamp && { timestamp: `<${lastTimestamp}` }),
        },
      });
      if (data.length) {
        this.pushRequests(data);
        state.loaded();
      } else {
        state.complete();
      }
    },
    async fetchNextResponsesPage(state) {
      const lastTimestamp = this.responses[this.responses.length - 1]?.timestamp;
      const { data } = await axios.get('/responses', {
        params: {
          $sort: '-timestamp',
          $limit: '5',
          ...(lastTimestamp && { timestamp: `<${lastTimestamp}` }),
        },
      });
      if (data.length) {
        this.pushResponses(data);
        state.loaded();
      } else {
        state.complete();
      }
    },
  },
};
</script>

<style lang='scss'>
body {
  margin: 0;
}

.wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: 'requests responses';
  height: 100vh;
}

%column {
  padding: 15px;
  display: inline-block;
  overflow-y: scroll;
}
.requests {
  @extend %column;
  grid-area: requests;
}
.responses {
  @extend %column;
  grid-area: responses;
}

.response, .request {
  &--active {
    background: lightblue;
  }
}
</style>
