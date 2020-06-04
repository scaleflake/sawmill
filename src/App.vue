<template>
<main>
  <div class="controls">
    <span>Your IP: {{ ip }}</span>

    <br>

    <span style="margin-right: 5px">Filter query</span>
    <input
      type="text"
      style="margin-right: 5px"
      v-model="filterQueryString"
      :style="{ border: filterQueryIsValid ? '' : 'solid 2px red' }"
      @keyup.enter="applyFilter"
    >
    <button
      style="margin-right: 5px"
      @click="applyFilter"
    >
      Apply
    </button>
    <span
      style="text-decoration:underline; text-decoration-style: dashed;"
      :title="tooltipText"
    >
      Examples
    </span>

    <br>

    <button
      style="margin-right: 5px"
      @click="putMarker"
    >
      Put marker
    </button>
    <button
      style="margin-right: 5px"
      @click="clearMarkers"
    >
      Clear markers
    </button>
  </div>

  <div class="wrapper">
    <div
      class="requests"
      ref="requests"
      :style="{ 'border-top': requestsScrolledToTop ? 'solid 15px #89ff9a': 'solid 15px white' }"
    >
      <Request
        v-for='req in requests'
        :key='req.traceId'
        :req='req'
      />
      <InfiniteLoading
        v-if="shouldRenderRequestsInfinite"
        @infinite="fetchNextRequestsPage"
      />
    </div>
    <div
      class="responses"
      ref="responses"
      :style="{ 'border-top': responsesScrolledToTop ? 'solid 15px #89ff9a': 'solid 15px white' }"
    >
      <Response
        v-for='res in responses'
        :key='res.traceId'
        :res='res'
      />
      <InfiniteLoading
        v-if="shouldRenderResponsesInfinite"
        @infinite="fetchNextResponsesPage"
      />
    </div>
  </div>
</main>
</template>

<script>
import lo from 'lodash';
import sift from 'sift';
import axios from 'axios';
import JSON5 from 'json5';
import InfiniteLoading from 'vue-infinite-loading';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { mapMutations, mapState } from 'vuex';
import Request from './Request.vue';
import Response from './Response.vue';

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
    Response,
    InfiniteLoading,
  },
  data() {
    return {
      ip: null,

      filterQueryString: '',
      filterQueryIsValid: true,
      filterQueryObject: null,
      filterFunction: null,

      requestsScrolledToTop: false,
      responsesScrolledToTop: false,

      shouldRenderRequestsInfinite: true,
      shouldRenderResponsesInfinite: true,
    };
  },
  async created() {
    const { data: { ip } } = await axios.get('https://api.ipify.org?format=json');
    this.ip = ip;

    const baseUrl = process.env.VUE_APP_WS_API_BASE_URL || 'ws://localhost:14080/logger';

    const ws = new ReconnectingWebSocket(`${baseUrl}/ws`);
    ws.onmessage = (message) => {
      const addRequest = (data) => {
        if (this.requestsScrolledToTop) {
          this.unshiftRequests([data]);
        } else {
          this.pushRequestsToBuffer([data]);
        }
      };
      const addResponse = (data) => {
        if (this.responsesScrolledToTop) {
          this.unshiftResponses([data]);
        } else {
          this.pushResponsesToBuffer([data]);
        }
      };

      for (const { event, data } of JSON.parse(message.data)) {
        switch (event) {
          case 'request':
            if (this.filterFunction) {
              if (this.filterFunction(data)) {
                addRequest(data);
              }
            } else {
              addRequest(data);
            }
            break;
          case 'response':
            // if (this.filterFunction) {
            //   if (this.filterFunction(data))
            // }
            addResponse(data);
            break;
          default:
            break;
        }
      }
    };
    ws.onopen = () => {
      console.log('WebSocket opened!');
    };
    ws.onclose = () => {
      console.log('WebSocket closed!');
    };
  },
  async mounted() {
    this.requestsScrolledToTop = this.$refs.requests.scrollTop === 0;
    this.$refs.requests.addEventListener('scroll', (event) => {
      this.requestsScrolledToTop = event.target.scrollTop < 35;
    });

    this.responsesScrolledToTop = this.$refs.responses.scrollTop === 0;
    this.$refs.responses.addEventListener('scroll', (event) => {
      this.responsesScrolledToTop = event.target.scrollTop < 35;
    });

    console.log(this.$refs.requestsInfinite);
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

    filterQueryString: (() => {
      function filterQueryString(newV) {
        if (newV === '') {
          this.filterQueryIsValid = true;
          this.filterQueryObject = null;
          this.filterFunction = null;
          return;
        }

        let filterQueryObject;
        try {
          filterQueryObject = JSON5.parse(newV);
        } catch {
          this.filterQueryIsValid = false;
          return;
        }

        let filterFunction;
        try {
          filterFunction = sift(filterQueryObject);
        } catch {
          this.filterQueryIsValid = false;
          return;
        }

        this.filterQueryIsValid = true;
        this.filterQueryObject = filterQueryObject;
        this.filterFunction = filterFunction;
      }

      return lo.debounce(filterQueryString, 200);
    })(),
  },
  computed: {
    ...mapState([
      'requests',
      'requestsBuffer',
      'responses',
      'responsesBuffer',
      'selectedTraceId',
    ]),

    tooltipText() {
      return ''
      + `{ fromIp: '${this.ip}' }\n\n`
      + `{ fromIp: '${this.ip}', url: { $in: ['/rpc', '/rpc/'] } }\n\n`
      + `{ fromIp: '${this.ip}', method: 'DELETE' }\n\n`
      + `{ fromIp: '${this.ip}', method: 'POST', url: { $nin: ['/rpc', '/rpc/'] } }\n\n`
      + '{ url: { $regex: \'^/asMaster\' } }';
    },
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
      'resetState',
      'putMarker',
      'clearMarkers',
    ]),
    async fetchNextRequestsPage(state) {
      const { traceId, timestamp } = this.requests[this.requests.length - 1] || {};

      const filter = this.filterQueryObject || {};
      if (traceId || timestamp) {
        Object.assign(filter, {
          $or: [
            { timestamp: { $lt: timestamp } },
            { timestamp, traceId: { $gt: traceId } },
          ],
        });
      }

      const { data } = await axios.get('/requests', {
        params: {
          $sort: '-timestamp,traceId',
          $limit: '5',
          ...(Object.keys(filter).length && { $filter: JSON5.stringify(filter) }),
        },
      });
      if (data.length) {
        this.pushRequests(data);
        if (state) {
          state.loaded();
        }
      } else {
        if (state) {
          state.complete();
        }
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

    applyFilter() {
      this.resetState();
      this.rerenderRequestsInfinite();
      this.rerenderResponsesInfinite();
    },

    rerenderRequestsInfinite() {
      this.shouldRenderRequestsInfinite = false;
      this.$nextTick(() => {
        this.shouldRenderRequestsInfinite = true;
      });
    },
    rerenderResponsesInfinite() {
      this.shouldRenderResponsesInfinite = false;
      this.$nextTick(() => {
        this.shouldRenderResponsesInfinite = true;
      });
    },
  },
};
</script>

<style lang='scss'>
body {
  margin: 0;
}

main {
  display: flex;
  flex-flow: column;
  height: 100vh;
}

.controls {
  background: #dff2ff;

  input[type="text"] {
    font-family: monospace;
    width: 800px;
  }
}

.wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: 'requests responses';
  flex: 1;
  overflow: auto;
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
</style>
