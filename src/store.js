import Vue from 'vue';
import vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import { restoreDollarSignsAndDots } from './utility';

Vue.use(vuex);

const getInitialState = () => ({
  requests: [], // from new to old
  // requestsBuffer: [], // from old to new

  // responses: [], // from new to old
  // responsesBuffer: [], // from old to new

  selectedTraceId: null,
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
      const request = state.requests.find((r) => r.traceId === response.traceId);
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
      state.requests.push(...requests.map((r) => {
        restoreDollarSignsAndDots(r);
        if (!r.response) {
          r.response = null;
        }
        return r;
      }));
    },
    // pushResponses: (state, responses) => {
    //   state.responses.push(...responses);
    // },

    unshiftRequests: (state, requests) => {
      state.requests.unshift(...requests.map((r) => {
        restoreDollarSignsAndDots(r);
        if (!r.response) {
          r.response = null;
        }
        return r;
      }));
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

    putMarker: (state) => {
      if (!state.markers.includes(state.requests[0].traceId)) {
        state.markers.push(state.requests[0].traceId);
      }
    },
    clearMarkers: (state) => {
      state.markers = [];
    },
  },
  getters: {
    traceIdToRequest: (state) => {
      state.reduce();
    },
  },
});

export default store;
