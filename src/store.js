import Vue from 'vue';
import vuex from 'vuex';
import { restoreDollarSignsAndDots } from './helpers';

Vue.use(vuex);

const getInitialState = () => ({
  requests: [], // from new to old
  requestsBuffer: [], // from old to new

  responses: [], // from new to old
  responsesBuffer: [], // from old to new

  selectedTraceId: null,
  markers: [],
});

const store = new vuex.Store({
  state: getInitialState(),
  mutations: {
    resetState: (state) => {
      Object.assign(state, getInitialState());
    },

    pushRequests: (state, requests) => {
      state.requests.push(...requests.map(restoreDollarSignsAndDots));
    },
    pushResponses: (state, responses) => {
      state.responses.push(...responses);
    },

    pushRequestsToBuffer: (state, requests) => {
      state.requestsBuffer.push(...requests);
    },
    pushResponsesToBuffer: (state, responses) => {
      state.responsesBuffer.push(...responses);
    },

    unshiftRequests: (state, requests) => {
      state.requests.unshift(...requests.map(restoreDollarSignsAndDots));
    },
    unshiftResponses: (state, responses) => {
      state.responses.unshift(...responses);
    },

    extractRequestsFromBuffer: (state) => {
      state.requests.unshift(...state.requestsBuffer.splice(0, 5).reverse().map(restoreDollarSignsAndDots));
    },
    extractResponsesFromBuffer: (state) => {
      state.responses.unshift(...state.responsesBuffer.splice(0, 5).reverse());
    },

    selectTraceId: (state, traceId) => {
      if (state.selectedTraceId === traceId) {
        state.selectedTraceId = null;
      } else {
        state.selectedTraceId = traceId;
      }
    },

    putMarker: (state) => {
      state.markers.push(state.requests[0].traceId);
    },
    clearMarkers: (state) => {
      state.markers = [];
    },
  },
});

export default store;
