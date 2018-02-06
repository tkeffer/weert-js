/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import {combineReducers} from 'redux';
import {
    SELECT_TIME_SCALE,
    SELECT_TIME_DETAIL,
    FETCH_MEASUREMENT_REQUEST,
    FETCH_MEASUREMENT_SUCCESS,
    FETCH_MEASUREMENT_FAILURE,
    FETCH_STATS_REQUEST,
    FETCH_STATS_SUCCESS,
    FETCH_STATS_FAILURE,
    NEW_PACKET
} from './actions';

const initialTimeScale = 'day';

const initialTimeDetail = 5;

const initialTags = {
    platform: "default_platform",
    stream  : "default_stream"
};

const initialPacketState = {
    wxpackets: {
        isFetching : false,
        maxAge     : 300000,
        aggregation: undefined,
        packets    : [],
        stats      : {}
    },
    wxrecords: {
        isFetching : false,
        maxAge     : 97200000,           // = 27 hours in milliseconds
        aggregation: undefined,
        packets    : [],
        stats      : {}
    }
};


function reduceTimeScale(state = initialTimeScale, action) {
    switch (action.type) {
        case SELECT_TIME_SCALE:
            return action.timeScale;
        default:
            return state;
    }
}

function reduceTimeDetail(state = initialTimeDetail, action) {
    switch (action.type) {
        case SELECT_TIME_DETAIL:
            return action.timeDetail;
        default:
            return state;
    }
}

function reduceTags(state = initialTags, action) {
    return state;
}

function reduceMeasurement(state, action) {
    switch (action.type) {
        case FETCH_MEASUREMENT_REQUEST:
            return {
                ...state,
                isFetching: true
            };
        case FETCH_MEASUREMENT_SUCCESS:
            return {
                ...state,
                isFetching : false,
                maxAge     : action.maxAge,
                aggregation: action.aggregation,
                packets    : action.packets,
            };
        case NEW_PACKET:
            return {
                ...state,
                packets: pushPacket(state.packets, action.packet, state.maxAge)
            };
        default:
            return state;
    }

}

function reduceMeasurements(state = initialPacketState, action) {
    switch (action.type) {
        case FETCH_MEASUREMENT_REQUEST:
        case FETCH_MEASUREMENT_SUCCESS:
        case NEW_PACKET:
            return Object.assign({}, state, {
                [action.measurement]: reduceMeasurement(state[action.measurement], action)
            });
        default:
            return state;
    }
}

function pushPacket(packets, packet, maxAge) {
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

const rootReducer = combineReducers({
                                        selectedTimeScale : reduceTimeScale,
                                        selectedTimeDetail: reduceTimeDetail,
                                        selectedTags      : reduceTags,
                                        measurements      : reduceMeasurements,
                                    });

export default rootReducer;

