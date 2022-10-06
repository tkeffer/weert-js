/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import { combineReducers } from "redux";
import * as utility from "./utility";

import {
  SELECT_TAGS,
  SELECT_TIME_SPAN,
  SELECT_TIME_DETAIL,
  FETCH_TIMESPAN_IN_PROGRESS,
  FETCH_TIMESPAN_SUCCESS,
  FETCH_STATS_IN_PROGRESS,
  FETCH_STATS_SUCCESS,
  FETCH_STATS_FAILURE,
  NEW_PACKET,
  FETCH_ABOUT_IN_PROGRESS,
  FETCH_ABOUT_SUCCESS,
  FETCH_ABOUT_FAILURE
} from "./actions";

const initialTags = {
  platform: "default_platform",
  stream: "default_stream"
};

const initialTimeSpan = "recent";

const initialTimeSpanState = {
  recent: {
    isFetching: false,
    measurement: "wxpackets",
    packets: [],
    options: {
      maxAge: 3600000, // = 1 hour in milliseconds
      selectedTimeDetail: 5 // 5 | 10 | 20 | 60
    }
  },
  day: {
    isFetching: false,
    measurement: "wxrecords",
    packets: [],
    options: {
      maxAge: 27 * 3600000, // = 27 hours in milliseconds
      aggregation: undefined
    }
  },
  week: {
    isFetching: false,
    measurement: "wxrecords",
    packets: [],
    options: {
      maxAge: 7 * 24 * 3600000, // = 7 days in milliseconds
      aggregation: "1h"
    }
  },
  month: {
    isFetching: false,
    measurement: "wxrecords",
    packets: [],
    options: {
      maxAge: 30 * 24 * 3600000, // = 30 days in milliseconds
      aggregation: "3h"
    }
  },
  year: {
    isFetching: false,
    measurement: "wxrecords",
    packets: [],
    options: {
      maxAge: 365 * 24 * 3600000, // = 365 days in milliseconds
      aggregation: "6h"
    }
  }
};

const initialStatsState = {
  day: {
    isFetching: false,
    measurement: "wxpackets",
    data: {}
  },
  week: {
    isFetching: false,
    measurement: "wxrecords",
    data: {}
  },
  month: {
    isFetching: false,
    measurement: "wxrecords",
    data: {}
  },
  year: {
    isFetching: false,
    measurement: "wxrecords",
    data: {}
  }
};

const initialAbout = {
  isFetching: false,
  server_uptime: undefined,
  weert_uptime: undefined,
  node_version: "unknown",
  weert_version: "unknown"
};

function reduceTags(state = initialTags, action) {
  switch (action.type) {
    case SELECT_TAGS:
      return action.tags;
    default:
      return state;
  }
}

function reduceSelectedTimeSpan(state = initialTimeSpan, action) {
  switch (action.type) {
    case SELECT_TIME_SPAN:
      if (action.timeSpan === state.selectedTimeSpan) {
        return state;
      }
      return action.timeSpan;
    default:
      return state;
  }
}

function reduceTimeSpans(state = initialTimeSpanState, action) {
  switch (action.type) {
    case SELECT_TIME_DETAIL:
      if (action.timeDetail === state.recent.options.selectedTimeDetail) {
        return state;
      }
      return {
        ...state,
        recent: {
          ...state.recent,
          options: {
            ...state.recent.options,
            selectedTimeDetail: action.timeDetail
          }
        }
      };
    case FETCH_TIMESPAN_IN_PROGRESS:
      return {
        ...state,
        [action.timeSpan]: {
          ...state[action.timeSpan],
          isFetching: true
        }
      };
    case FETCH_TIMESPAN_SUCCESS:
      return {
        ...state,
        [action.timeSpan]: {
          ...state[action.timeSpan],
          isFetching: false,
          packets: action.packets
        }
      };
    case NEW_PACKET:
      return pushPacketOnTimeSpans(state, action);
    default:
      return state;
  }
}

function reduceStats(state = initialStatsState, action) {
  switch (action.type) {
    case FETCH_STATS_IN_PROGRESS:
      return {
        ...state,
        [action.timeSpan]: {
          ...state[action.timeSpan],
          isFetching: true
        }
      };
    case FETCH_STATS_SUCCESS:
      return {
        ...state,
        [action.timeSpan]: {
          ...state[action.timeSpan],
          isFetching: false,
          data: action.stats
        }
      };
    case FETCH_STATS_FAILURE:
    default:
      return state;
  }
}

function reduceAbout(state = initialAbout, action) {
  switch (action.type) {
    case FETCH_ABOUT_IN_PROGRESS:
      return {
        ...state,
        isFetching: true
      };
    case FETCH_ABOUT_SUCCESS:
      return {
        ...state,
        isFetching: false,
        ...action.about
      };
    case FETCH_ABOUT_FAILURE:
    default:
      return state;
  }
}

// Combine all the reducers into one big reducer. The final state will be a composite, with keys
// 'selectedTags', 'selectedTimeSpan', 'timeSpans' and 'stats':
const rootReducer = combineReducers({
  selectedTags: reduceTags,
  selectedTimeSpan: reduceSelectedTimeSpan,
  timeSpans: reduceTimeSpans,
  stats: reduceStats,
  about: reduceAbout
});

export default rootReducer;

/*
 * Utility functions
 */

function pushPacketOnTimeSpans(state, action) {
  const { measurement, packet } = action;

  // We don't want to mutate state. So, build a new copy.
  let newState = {};

  // Iterate over all the time spans
  for (let timeSpan of Object.keys(state)) {
    const { options, packets } = state[timeSpan];

    // Does this time span use the incoming measurement? Also, we cannot handle aggregations
    if (state[timeSpan].measurement === measurement && options.aggregation === undefined) {
      // The new state will be the old state, with the packet array replaced with an
      // array that has the packet inserted into the proper spot.
      newState[timeSpan] = {
        ...state[timeSpan],
        packets: utility.insertSorted(packets, packet, options.maxAge)
      };
    } else {
      // This time span does not use the measurement. Just use the old state.
      newState[timeSpan] = state[timeSpan];
    }
  }
  return newState;
}
