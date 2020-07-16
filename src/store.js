import Vue from 'vue';
import vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import { restoreDollarSignsAndDots, binarySearch } from './utility';

Vue.use(vuex);

const getInitialState = () => ({
  requestsMap: new Map(),
  requests: [], // from new to old (timestamp 3 2 1)

  // requestsBuffer: [], // from old to new

  // responses: [], // from new to old
  // responsesBuffer: [], // from old to new

  selectedTraceId: null,
  highlightedTraceId: null,
  markers: [],
});

const store = new vuex.Store({
  state: getInitialState(),
  plugins: [
    createPersistedState({ paths: ['markers'] }),
  ],
  mutations: {
    resetState: (state) => {
      Object.assign(state, getInitialState());
    },

    applyResponse: (state, response) => {
      const request = state.requestsMap.get(response.traceId);
      // const request = state.requests.find((r) => r.traceId === response.traceId);
      if (request) {
        request.response = response;
      }
    },

    // pushRequestsToBuffer: (state, requests) => {
    //   state.requestsBuffer.push(...requests);
    // },
    // pushResponsesToBuffer: (state, responses) => {
    //   state.responsesBuffer.push(...responses);
    // },

    pushRequests: (state, requests) => {
      for (const r of requests) {
        if (!state.requestsMap.has(r.traceId)) {
          restoreDollarSignsAndDots(r);
          if (!r.response) {
            r.response = null;
          }
          state.requests.push(r);
          state.requestsMap.set(r.traceId, r);
        }
      }
    },
    // pushResponses: (state, responses) => {
    //   state.responses.push(...responses);
    // },

    unshiftRequests: (state, requests) => {
      const compareRequests = (a, b) => {
        const d = b.timestamp - a.timestamp;
        if (d !== 0) {
          return d;
        }

        if (a.traceId < b.traceId) {
          return -1;
        }
        if (a.traceId > b.traceId) {
          return 1;
        }
        return 0;
      };

      for (const r of requests) {
        if (!state.requestsMap.has(r.traceId)) {
          restoreDollarSignsAndDots(r);
          if (!r.response) {
            r.response = null;
          }
          state.requestsMap.set(r.traceId, r);

          const i = binarySearch(state.requests, r, compareRequests);
          state.requests.splice(i, 0, r);
        }
      }
    },
    // unshiftResponses: (state, responses) => {
    //   state.responses.unshift(...responses);
    // },

    // extractRequestsFromBuffer: (state) => {
    //   state.requests.unshift(...state.requestsBuffer.splice(0, 5).reverse().map(restoreDollarSignsAndDots));
    // },
    // extractResponsesFromBuffer: (state) => {
    //   state.responses.unshift(...state.responsesBuffer.splice(0, 5).reverse());
    // },

    // pushRequests: (state, requests) => {
    //   state.requests = [
    //     ...state.requests.slice(state.requests.length - 100),
    //     ...requests.map(restoreDollarSignsAndDots),
    //   ];
    // },
    // pushResponses: (state, responses) => {
    //   state.responses = [
    //     ...state.responses.slice(state.responses.length - 100),
    //     ...responses,
    //   ];
    // },

    // unshiftRequests: (state, requests) => {
    //   state.requests = [
    //     ...requests.map(restoreDollarSignsAndDots),
    //     ...state.requests.slice(0, 100),
    //   ];
    // },
    // unshiftResponses: (state, responses) => {
    //   state.responses = [
    //     ...responses,
    //     ...state.responses.slice(0, 100),
    //   ];
    // },

    // extractRequestsFromBuffer: (state) => {
    //   state.requests = [
    //     ...state.requestsBuffer.splice(0, 5).reverse().map(restoreDollarSignsAndDots),
    //     ...state.requests.slice(0, 100),
    //   ];
    // },
    // extractResponsesFromBuffer: (state) => {
    //   state.responses = [
    //     ...state.responsesBuffer.splice(0, 5).reverse(),
    //     ...state.responses.slice(0, 100),
    //   ];
    // },

    selectTraceId: (state, traceId) => {
      if (state.selectedTraceId === traceId) {
        state.selectedTraceId = null;
      } else {
        state.selectedTraceId = traceId;
      }
    },
    highlightTraceId: (state, traceId) => {
      state.highlightedTraceId = traceId;
    },

    putMarker: (state) => {
      if (!state.markers.includes(state.requests[0].traceId)) {
        state.markers.push(state.requests[0].traceId);
      }
    },
    putMarkerAboveSelected: (state) => {
      const request = state.requestsMap.get(state.selectedTraceId);
      // const request = state.requests.find((r) => r.traceId === state.selectedTraceId);
      if (!state.markers.includes(request.traceId)) {
        state.markers.push(request.traceId);
      }
    },
    clearMarkers: (state) => {
      state.markers = [];
    },
  },
});

export default store;
