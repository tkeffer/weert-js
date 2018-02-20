/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import moment from 'moment/moment';
import {combineReducers} from 'redux';
import {findFirstGood, isDevelopment} from './utility';

import {
    SELECT_TAGS,
    SELECT_TIME_SPAN,
    SELECT_NEW_START_TIME,
    SELECT_TIME_DETAIL,
    START_NEW_TIMESPAN,
    FETCH_TIMESPAN_IN_PROGRESS,
    FETCH_TIMESPAN_SUCCESS,
    FETCH_TIMESPAN_FAILURE,
    FETCH_STATS_IN_PROGRESS,
    FETCH_STATS_SUCCESS,
    FETCH_STATS_FAILURE,
    NEW_PACKET,
} from './actions';

const initialTags = {
    platform: "default_platform",
    stream  : "default_stream"
};

const initialTimeSpan = 'recent';

const initialTimeSpanState = {
    recent: {
        isFetching : false,
        measurement: "wxpackets",
        packets    : [],
        options    : {
            maxAge            : 3600000,        // = 1 hour in milliseconds
            selectedTimeDetail: 5,              // 5 | 10 | 20 | 60
        }
    },
    day   : {
        isFetching : false,
        measurement: "wxrecords",
        packets    : [],
        options    : {
            start      : moment().startOf('day').valueOf(),
            aggregation: undefined,
        },
    },
    week  : {
        isFetching : false,
        measurement: "wxrecords",
        packets    : [],
        options    : {
            start      : moment().startOf('week').valueOf(),
            aggregation: '1h',
        }
    },
    month : {
        isFetching : false,
        measurement: "wxrecords",
        packets    : [],
        options    : {
            start      : moment().startOf('month').valueOf(),
            aggregation: '3h',
        }
    },
    year  : {
        isFetching : false,
        measurement: "wxrecords",
        packets    : [],
        options    : {
            start      : moment().startOf('year').valueOf(),
            aggregation: '6h',
        }
    },
};

const initialStatsState = {
    day  : {
        isFetching : false,
        measurement: "wxpackets",
        data       : {}
    },
    week : {
        isFetching : false,
        measurement: "wxrecords",
        data       : {}
    },
    month: {
        isFetching : false,
        measurement: "wxrecords",
        data       : {}
    },
    year : {
        isFetching : false,
        measurement: "wxrecords",
        data       : {}
    },
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
            if (action.timeSpan === state.selectedTimeSpan){
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
            if (action.timeDetail === state.recent.options.selectedTimeDetail){
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
                    isFetching: true,
                }
            };
        case FETCH_TIMESPAN_SUCCESS:
            return {
                ...state,
                [action.timeSpan]: {
                    ...state[action.timeSpan],
                    isFetching: false,
                    packets   : action.packets,
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
                    isFetching: true,
                }
            };
        case FETCH_STATS_SUCCESS:
            return {
                ...state,
                [action.timeSpan]: {
                    ...state[action.timeSpan],
                    isFetching: false,
                    data      : action.stats,
                }
            };
        case FETCH_STATS_FAILURE:
        default:
            return state;
    }
}

// Combine all the reducers into one big reducer. The final state will be a composite, with keys
// 'selectedTags', 'selectedTimeSpan', 'timeSpans' and 'stats':
const rootReducer = combineReducers({
                                        selectedTags    : reduceTags,
                                        selectedTimeSpan: reduceSelectedTimeSpan,
                                        timeSpans       : reduceTimeSpans,
                                        stats           : reduceStats,
                                    });

export default rootReducer;

/*
 * Utility functions
 */

function pushPacketOnTimeSpans(state, action) {
    const {measurement, packet} = action;

    // We don't want to mutate state. So, build a new copy.
    let newState = {};

    // Iterate over all the time spans
    for (let timeSpan of Object.keys(state)) {

        const {options, packets} = state[timeSpan];

        // Does this time span use the incoming measurement? Also, we cannot handle aggregations
        if (state[timeSpan].measurement === measurement && options.aggregation === undefined) {

            // Find the first packet we are going to keep. This will be all the packets for time spans other
            // than 'recent':
            const firstGood    = findFirstGood(packets, options.maxAge);
            // Make a copy of the packets we are going to keep, then add the new packet to the end
            newState[timeSpan] = {
                ...state[timeSpan],
                packets: [...packets.slice(firstGood), packet]
            };
        } else {
            // This time span does not use the measurement. Just use the old state.
            newState[timeSpan] = state[timeSpan];
        }
    }
    return newState;
}