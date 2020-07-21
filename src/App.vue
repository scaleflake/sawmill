<template>
<main
  :class="{ dark: isDark, light: !isDark }"
  tabindex="-1"
  @keyup.alt.77="putMarker"
>
  <div class="controls">
    <div class="panel">
      <div class="row">
        <span style="margin-right: 5px">Your IP: {{ ip }}</span>
        <button
          @click="() => {
            const code = `{ fromIp: '${ip}' }`;
            codeJar.updateCode(code);
            this.filterQueryString = code;
          }"
        >
          Apply as filter
        </button>
      </div>

      <div class="row">
        <span style="margin-right: 5px">Filter query:</span>
        <code
          ref="filterQueryInput"
          class="language-yaml"
          style="display: block; border-radius: 0px; margin-bottom: 0"
          :style="{ border: filterQueryIsValid ? 'solid 3px transparent' : 'solid 3px red',  }"
          @keydown.ctrl.enter.prevent="applyFilter"
        />
      </div>

      <div class="row">
        <button
          style="margin-right: 5px"
          @click="applyFilter"
        >
          Apply (CTRL + Enter)
        </button>
        <span
          style="text-decoration: underline; text-decoration-style: dashed;"
          :title="tooltipText"
        >
          Examples
        </span>
      </div>
    </div>

    <div class="panel">
      <button
        style="margin-right: 5px"
        @click="putMarker"
      >
        Put marker to top (ALT + M)
      </button>
      <button
        style="margin-right: 5px"
        @click="putMarkerAboveSelected"
      >
        Put marker above selected request
      </button>
      <button
        style="margin-right: 5px"
        @click="clearMarkers"
      >
        Clear markers ({{ markers.length }})
      </button>
    </div>

    <div class="panel">
      <button
        style="margin-right: 5px"
        @click="buildTimeline"
      >
        Build timeline
      </button>
      <button
        style="margin-right: 5px"
        @click="timelineIsVisible = !timelineIsVisible"
      >
        {{ timelineIsVisible ? 'Hide timeline' : 'Show timeline' }}
      </button>
      <button
        style="margin-right: 5px"
        @click="fitTimeline"
      >
        Fit timeline
      </button>
      <span style="margin-right: 5px">Timeline info: {{ timelineInfoText }}</span>
    </div>
  </div>

  <!-- <div class="wrapper">
    <div
      class="requests"
      ref="requests"
      :class="{ 'active': requestsScrolledToTop }"
    >
      <InfiniteLoading
        direction="top"
        @infinite="fetchNewRequestsPage"
        :identifier="newerRequestsInfiniteLoaderId"
      />
      <Request
        v-for='req in requests'
        :key='req.traceId'
        :req='req'
      />
      <InfiniteLoading
        @infinite="fetchNextRequestsPage"
        :identifier="olderRequestsInfiniteLoaderId"
      />
    </div>

    <div
      class="responses"
      ref="responses"
      :class="{ 'active': responsesScrolledToTop }"
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
  </div> -->

  <div
    ref='timeline'
    :style="{ display: timelineIsVisible ? 'block' : 'none' }"
  />

  <div
    ref='requests'
    :class="{ 'active': requestsScrolledToTop }"
    :style="{
      display: 'inline-block',
      overflowY: 'scroll',
      borderTop: `solid 15px ${requestsScrolledToTop ? 'var(--column-active-indicator-color)' : 'transparent'}`,
    }"
  >
    <InfiniteLoading
      direction="top"
      @infinite="fetchNewRequestsPage"
      :identifier="newerRequestsInfiniteLoaderId"
    />
    <RequestAndResponse
      v-for="req in requests"
      :key="req.traceId"
      :req="req"
      :res="req.res"
    />
    <InfiniteLoading
      @infinite="fetchNextRequestsPage"
      :identifier="olderRequestsInfiniteLoaderId"
    />
  </div>
</main>
</template>

<script>
import lo from 'lodash';
import sift from 'sift';
import axios from 'axios';
import JSON5 from 'json5';
import Prism from 'prismjs';
// import 'prismjs/themes/prism-okaidia.css';
import 'prismjs/themes/prism-coy.css';
import 'prismjs/components/prism-yaml.min';
import { CodeJar } from 'codejar';
import { Timeline } from 'vis-timeline';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import InfiniteLoading from 'vue-infinite-loading';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { mapMutations, mapState } from 'vuex';
// import Request from './Request.vue';
// import Response from './Response.vue';
import RequestAndResponse from './RequestAndResponse.vue';
import { /* scrollBarStorage, */ queue } from './utility';

axios.defaults.baseURL = process.env.VUE_APP_REST_API_BASE_URL || 'http://localhost:14080/logger';

export default {
  components: {
    // Request,
    // Response,
    InfiniteLoading,
    RequestAndResponse,
  },
  data() {
    return {
      isDark: false,

      ip: null,

      filterQueryString: '',
      filterQueryIsValid: true,
      filterQueryObject: null,
      filterFunction: null,

      requestsScrolledToTop: false,
      // responsesScrolledToTop: false,

      // shouldRenderRequestsInfinite: true,
      // shouldRenderResponsesInfinite: true,

      requestsLoadingQueue: queue(),

      newerRequestsInfiniteLoaderId: Date.now(),
      olderRequestsInfiniteLoaderId: Date.now() + 100000,

      codeJar: null,

      timeline: null,
      timelineIsVisible: true,
    };
  },
  async created() {
    const savedFilterQueryString =
      localStorage.getItem('sawmill:filterQueryString') ||
      localStorage.getItem('logs-wizard:filterQueryString');
    if (typeof savedFilterQueryString === 'string') {
      this.filterQueryString = savedFilterQueryString;
      this.checkAndCompileFilterQueryString(this.filterQueryString);
    }

    this.fetchNextRequestsPage();

    const { data: { ip } } = await axios.get('https://api.ipify.org?format=json');
    this.ip = ip;

    const baseUrl = process.env.VUE_APP_WS_API_BASE_URL || 'ws://localhost:14080/logger';

    let i = 0;
    const ws = new ReconnectingWebSocket(`${baseUrl}/ws`);
    ws.onmessage = (event) => {
      const addRequest = (data) => {
        if (this.requestsScrolledToTop) {
          this.unshiftRequests([data]);
        } else {
          this.newerRequestsInfiniteLoaderId += 1;
        }
      };

      // for (const { event, data } of JSON.parse(event.data)) {
      //   switch (event) {
      //     case 'request':
      //       if (this.filterFunction) {
      //         if (this.filterFunction(data)) {
      //           addRequest(data);
      //         }
      //       } else {
      //         addRequest(data);
      //       }
      //       break;
      //     case 'response':
      //       this.applyResponse(data);
      //       break;
      //     default:
      //       break;
      //   }
      // }

      const requests = [];
      const responses = [];

      for (const { event: eventName, data } of JSON.parse(event.data)) {
        if (eventName === 'request') {
          requests.push(data);
        } else
        if (eventName === 'response') {
          responses.push(data);
        }
      }

      for (const request of requests) {
        if (this.filterFunction) {
          if (this.filterFunction(request)) {
            addRequest(request);
          }
        } else {
          addRequest(request);
        }
      }

      for (const response of responses) {
        this.applyResponse(response);
      }
    };
    ws.onopen = () => {
      i += 1;
      console.log(`WebSocket opened! (${i})`);
    };
    ws.onclose = () => {
      i -= 1;
      console.log(`WebSocket closed! (${i})`);
    };

    window.trySendRequestsInParallel = this.trySendRequestsInParallel;
    window.check = this.check;
  },
  async mounted() {
    this.requestsScrolledToTop = this.$refs.requests.scrollTop === 0;
    this.$refs.requests.addEventListener('scroll', (event) => {
      this.requestsScrolledToTop = event.target.scrollTop < 35;
    });

    // this.responsesScrolledToTop = this.$refs.responses.scrollTop === 0;
    // this.$refs.responses.addEventListener('scroll', (event) => {
    //   this.responsesScrolledToTop = event.target.scrollTop < 35;
    // });

    const jar = new CodeJar(this.$refs.filterQueryInput, (e) => {
      Prism.highlightElement(e);
    });
    jar.onUpdate((code) => {
      this.filterQueryString = code;
    });
    jar.updateCode(this.filterQueryString);
    this.codeJar = jar;
  },
  watch: {
    // responsesScrolledToTop(newV) {
    //   if (newV) {
    //     scrollBarStorage.save(this.$refs.responses);
    //     this.extractResponsesFromBuffer();
    //     requestAnimationFrame(() => {
    //       scrollBarStorage.restore(this.$refs.responses);
    //     });
    //   }
    // },

    selectedTraceId(newV) {
      if (this.timeline !== null) {
        if (typeof newV === 'string') {
          this.timeline.setSelection([newV]);
        } else {
          this.timeline.setSelection([]);
        }
      }
    },
    highlightedTraceId(newV, oldV) {
      if (this.timeline !== null) {
        if (typeof newV === 'string') {
          const origItem = this.timeline.itemsData.get(newV);
          if (origItem) {
            const newItem = { ...origItem, className: 'highlighted' };
            this.timeline.itemsData.update(newItem);
          }
        } else {
          if (typeof oldV === 'string') {
            const origItem = this.timeline.itemsData.get(oldV);
            if (origItem) {
              const newItem = { ...origItem, className: undefined };
              this.timeline.itemsData.update(newItem);
            }
          }
        }
      }
    },

    filterQueryString: (() => {
      const checkAndCompileFilterQueryString = lo.debounce((self, newV) => {
        self.checkAndCompileFilterQueryString(newV);
      }, 200);

      const saveFilterQueryString = lo.debounce((newV) => {
        localStorage.setItem('sawmill:filterQueryString', newV);
      }, 500);

      return function (newV) {
        checkAndCompileFilterQueryString(this, newV);
        saveFilterQueryString(newV);
      };
    })(),
  },
  computed: {
    ...mapState([
      'requests',
      // 'requestsBuffer',
      // 'responses',
      // 'responsesBuffer',
      'selectedTraceId',
      'highlightedTraceId',
      'markers',
    ]),

    tooltipText() {
      return ''
      + `{ fromIp: '${this.ip}' }\n\n`
      + `{ fromIp: '${this.ip}', url: { $in: ['/rpc', '/rpc/'] } }\n\n`
      + `{ fromIp: '${this.ip}', method: 'DELETE' }\n\n`
      + `{ fromIp: '${this.ip}', method: 'POST', url: { $nin: ['/rpc', '/rpc/'] } }\n\n`
      + '{ url: { $regex: \'^/asMaster\' } }';
    },

    timelineInfoText() {
      if (this.timeline) {
        const { min, max } = this.timeline.getItemRange();
        return `duration = ${max - min}ms`;
      }
      return '-';
    },
  },
  methods: {
    ...mapMutations([
      'applyResponse',
      'selectTraceId',
      'highlightTraceId',
      'pushRequests',
      // 'pushRequestsToBuffer',
      // 'extractRequestsFromBuffer',
      // 'pushResponses',
      // 'pushResponsesToBuffer',
      // 'extractResponsesFromBuffer',
      'unshiftRequests',
      // 'unshiftResponses',
      'resetState',
      'putMarker',
      'putMarkerAboveSelected',
      'clearMarkers',
    ]),

    async fetchNewRequestsPage(state) {
      this.requestsLoadingQueue.schedule(async () => {
        const { traceId, timestamp } = this.requests[0] || {};

        const filter = this.filterQueryObject || {};
        if (traceId || timestamp) {
          Object.assign(filter, {
            $or: [
              { timestamp: { $gt: timestamp } },
              { timestamp, traceId: { $lt: traceId } },
            ],
          });
        }

        const { data } = await axios.get('/requests', {
          params: {
            $sort: 'timestamp,-traceId',
            $limit: '10',
            $include: 'response',
            ...(Object.keys(filter).length && { $filter: JSON5.stringify(filter) }),
          },
        });

        if (data.length) {
          this.unshiftRequests(data.reverse());
          if (state) {
            state.loaded();
          }
        } else {
          if (state) {
            state.complete();
          }
        }
      });
    },

    async fetchNextRequestsPage(state) {
      this.requestsLoadingQueue.schedule(async () => {
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
            $limit: '10',
            $include: 'response',
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
      });
    },

    // async fetchNextResponsesPage(state) {
    //   const lastTimestamp = this.responses[this.responses.length - 1]?.timestamp;
    //   const { data } = await axios.get('/responses', {
    //     params: {
    //       $sort: '-timestamp',
    //       $limit: '10',
    //       ...(lastTimestamp && { timestamp: `<${lastTimestamp}` }),
    //     },
    //   });
    //   if (data.length) {
    //     this.pushResponses(data);
    //     state.loaded();
    //   } else {
    //     state.complete();
    //   }
    // },

    checkAndCompileFilterQueryString(filterQueryString) {
      if (filterQueryString === '') {
        this.filterQueryIsValid = true;
        this.filterQueryObject = null;
        this.filterFunction = null;
        return;
      }

      let filterQueryObject;
      try {
        filterQueryObject = JSON5.parse(filterQueryString);
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
    },

    async applyFilter() {
      this.resetState();
      await this.fetchNextRequestsPage();
      this.newerRequestsInfiniteLoaderId += 1;
      this.olderRequestsInfiniteLoaderId += 1;
      // this.rerenderResponsesInfinite();
    },

    // rerenderResponsesInfinite() {
    //   this.shouldRenderResponsesInfinite = false;
    //   this.$nextTick(() => {
    //     this.shouldRenderResponsesInfinite = true;
    //   });
    // },

    buildTimeline() {
      if (this.markers.length > 1) {
        this.$refs.timeline.innerHTML = '';

        // TODO: extract code below to getter?
        let lowerBound = Infinity;
        let upperBound = -Infinity;
        for (const traceId of this.markers) {
          const request = this.requests.find((r) => r.traceId === traceId);
          if (request && request.timestamp < lowerBound) {
            lowerBound = request.timestamp;
          }
          if (request && request.timestamp > upperBound) {
            upperBound = request.timestamp;
          }
        }
        const items = [];
        for (const r of this.requests) {
          if (
            r.timestamp > lowerBound &&
            r.timestamp <= upperBound &&
            !items.some((i) => i.id === r.traceId)
          ) {
            items.push({
              id: r.traceId,
              content: `${r.method} ${r.url}`,
              start: new Date(r.timestamp),
              ...(r.response && { end: new Date(r.response.timestamp) }),
            });
          }
        }

        const timeline = new Timeline(this.$refs.timeline, items, {});
        timeline.on('select', (properties) => {
          this.selectTraceId(properties.items[0]);
        });
        timeline.on('itemover', (properties) => {
          this.highlightTraceId(properties.item);
        });
        timeline.on('itemout', () => {
          this.highlightTraceId(null);
        });
        if (typeof this.selectedTraceId === 'string') {
          timeline.setSelection([this.selectedTraceId]);
        }
        this.timeline = timeline;
      }
    },
    fitTimeline() {
      if (this.timeline) {
        this.timeline.fit();
      }
    },

    async trySendRequestsInParallel() {
      if (this.markers.length > 1) {
        // TODO: extract code below to getter?
        let lowerBound = Infinity;
        let upperBound = -Infinity;
        for (const traceId of this.markers) {
          const request = this.requests.find((r) => r.traceId === traceId);
          if (request && request.timestamp < lowerBound) {
            lowerBound = request.timestamp;
          }
          if (request && request.timestamp > upperBound) {
            upperBound = request.timestamp;
          }
        }
        const requests = [];
        for (const request of this.requests) {
          if (
            request.timestamp > lowerBound &&
            request.timestamp <= upperBound &&
            !requests.some((r) => r.traceId === request.traceId)
          ) {
            requests.push(request);
          }
        }

        await Promise.all(requests.map((r) => (
          axios[r.method.toLowerCase()](`https://ba.narandev.ru/api/v1${r.url}`, {
            headers: { Authorization: r.headers.authorization },
          })
        )));
      }
    },

    check() {
      console.log(this.requests.every((r, i, rs) => (
        i === 0 ||
        (rs[i - 1].timestamp >= r.timestamp ?? rs[i - 1].traceId <= r.traceId)
      )));
    },
  },
};
</script>

<style lang='scss'>
body {
  margin: 0;
}

.light {
  --main-background: white;
  --font-color: black;
  --input-background: white;

  --controls-background: #dff2ff;
  --column-active-indicator-color: #89ff9a;

  --request-background: lightblue;
  --request-selected-background: #f7f799;
  --request-highlighted-background: #ecc8e6;

  --response-background: lightsteelblue;
  --response-active-background: lightblue;
}
.dark {
  --main-background: #121212;
  --font-color: white;
  --input-background: #242424;

  --controls-background: #191919;
  --column-active-indicator-color: rgba(0, 255, 180, 0.3);

  --request-background: #242424;
  --request-active-background: #303030;

  --response-background: #242424;
  --response-active-background: #303030;
}

main {
  display: flex;
  flex-flow: column;
  height: 100vh;
  background: var(--main-background);
  color: var(--font-color);
}

.controls {
  padding: 10px 5px;
  background: var(--controls-background);

  /* .panel + .panel {
    margin-top: 0;
  }

  .row + .row {
    margin-top: 0;
  } */

  input[type="text"] {
    font-family: monospace;
    width: 800px;
    background: var(--input-background);
    color: var(--font-color);
  }
}


/* VIS-TIMELINE */
.vis-item {
  cursor: pointer;
}
.vis-item:hover,
.vis-item.highlighted {
  background: #f9ddf6;
  border-color: #deb0f8;
}

/* .wrapper {
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
  border-top: solid 15px transparent;
}
.requests {
  @extend %column;
  grid-area: requests;
}
.responses {
  @extend %column;
  grid-area: responses;
}
.active {
  border-top: solid 15px var(--column-active-indicator-color);
} */
</style>
