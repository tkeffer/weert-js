/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import moment from 'moment/moment';
import {combineReducers} from 'redux';

import {
    SELECT_TAGS,
    SELECT_TIME_SPAN,
    SELECT_NEW_START_TIME,
    SELECT_TIME_DETAIL,
    START_NEW_TIMESPAN,
    FETCH_RECENT_IN_PROGRESS,
    FETCH_RECENT_SUCCESS,
    FETCH_RECENT_FAILURE,
    FETCH_TIMESPAN_IN_PROGRESS,
    FETCH_TIMESPAN_SUCCESS,
    FETCH_TIMESPAN_FAILURE,
    FETCH_STATS_REQUEST,
    FETCH_STATS_SUCCESS,
    FETCH_STATS_FAILURE,
    NEW_PACKET,
} from './actions';

const initialTags = {
    platform: "default_platform",
    stream  : "default_stream"
};

const initialTimeSpan = 'recent';

const initialRecentState = {
    isFetching        : false,
    measurement       : "wxpackets",
    maxAge            : 3600000,        // = 1 hour in milliseconds
    selectedTimeDetail: 5,              // 5 | 10 | 20 | 60
    packets           : [],
};

const initialTimeSpanState = {
    day  : {
        isFetching : false,
        measurement: "wxpackets",
        start      : moment().startOf('day').valueOf(),
        aggregation: undefined,
        packets    : [],
    },
    week : {
        isFetching : false,
        measurement: "wxrecords",
        start      : moment().startOf('week').valueOf(),
        aggregation: 3600000,      // = 1 hours in milliseconds
        packets    : []
    },
    month: {
        isFetching : false,
        measurement: "wxrecords",
        start      : moment().startOf('month').valueOf(),
        aggregation: 3600000,      // = 3 hours in milliseconds
        packets    : []
    },
    year : {
        isFetching : false,
        measurement: "wxrecords",
        start      : moment().startOf('year').valueOf(),
        aggregation: 21600000,      // = 6 hours in milliseconds
        packets    : []
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
            return action.timeSpan;
        default:
            return state;
    }
}

function reduceRecent(state = initialRecentState, action) {
    switch (action.type) {
        case SELECT_TIME_DETAIL:
            return {
                ...state,
                selectedTimeDetail: action.timeDetail
            };
        case FETCH_RECENT_IN_PROGRESS:
            return {
                ...state,
                isFetching: true
            };
        case FETCH_RECENT_SUCCESS:
            return {
                ...state,
                isFetching: false,
                packets   : action.packets
            };
        case NEW_PACKET:
            // Ignore any new packets that aren't associated with us
            if (action.measurement === state.measurement) {
                return {
                    ...state,
                    packets: pushPacketOnRecent(state.packets, action.packet, state.maxAge)
                };
            } else {
                return state;
            }
        default:
            return state;
    }
}

function reduceTimeSpans(state = initialTimeSpanState, action) {
    switch (action.type) {
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
    return state;
}

const rootReducer = combineReducers({
                                        selectedTags    : reduceTags,
                                        selectedTimeSpan: reduceSelectedTimeSpan,
                                        recent          : reduceRecent,
                                        timeSpans       : reduceTimeSpans,
                                        stats           : reduceStats,
                                    });

export default rootReducer;

/*
 * Utility functions
 */

function pushPacketOnRecent(packets, packet, maxAge) {
    let firstGood;

    // First, find the first packet less than maxAge old
    if (packets.length) {
        const trimTime    = Date.now() - maxAge;
        const firstRecent = packets.findIndex((packet) => {
            return packet.timestamp >= trimTime;
        });

        // If there was no good packet, skip them all. Otherwise, just
        // up to the first good packet
        firstGood = firstRecent === -1 ? packets.length : firstRecent;
    } else {
        firstGood = 0;
    }

    // Make a copy of the packets we are going to keep, then tack on the new packet at the end.
    return [
        ...packets.slice(firstGood),
        packet
    ];
}

function pushPacketOnTimeSpans(state, action) {
    const {measurement, packet} = action;

    // We don't want to mutate state. So, build a new copy.
    let newState = {};
    // Iterate over all the time spans
    for (let timeSpan of Object.keys(state)) {
        // Does this time span use the incoming measurement?
        if (state[timeSpan].measurement === measurement) {
            // It does. Make a copy, replacing the old array of packets with a new one
            // that has the new packet tacked on to the end
            newState[timeSpan] = {
                ...state[timeSpan],
                packets: [
                    ...state[timeSpan].packets,
                    packet
                ]
            };
        } else {
            // This time span does not use the measurement. Just use the old state.
            newState[timeSpan] = state[timeSpan];
        }
    }
    return newState;
}