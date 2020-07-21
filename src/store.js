import Vue from 'vue';
import vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import { restoreDollarSignsAndDots, binarySearch } from './utility';

Vue.use(vuex);

const getInitialState = () => ({
  requestsMap: new Map(),
  requests: [], // from new to old

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
      if (request) {
        request.response = response;
      }
    },

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
