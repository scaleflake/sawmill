import Vue from 'vue';
import vuex from 'vuex';

Vue.use(vuex);

const store = new vuex.Store({
  state: {
    requests: [], // from new to old
    requestsBuffer: [], // from old to new

    responses: [], // from new to old
    responsesBuffer: [], // from old to new

    selectedTraceId: null,
  },
  mutations: {
    setRequests: (state, requests) => {
      state.requests = requests;
    },
    setResponses: (state, responses) => {
      state.responses = responses;
    },

    pushRequests: (state, requests) => {
      state.requests.push(...requests);
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
      state.requests.unshift(...requests);
    },
    unshiftResponses: (state, responses) => {
      state.responses.unshift(...responses);
    },

    extractRequestsFromBuffer: state => {
      state.requests.unshift(...state.requestsBuffer.splice(0, 5).reverse());
    },
    extractResponsesFromBuffer: state => {
      state.responses.unshift(...state.responsesBuffer.splice(0, 5).reverse());
    },

    selectTraceId: (state, traceId) => {
      state.selectedTraceId = traceId;
    },
  },
});

export default store;
