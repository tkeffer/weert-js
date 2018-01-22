/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import {combineReducers} from 'redux';
import {
    FETCH_SERIES_REQUEST,
    FETCH_SERIES_SUCCESS,
    SELECT_SERIES,
    INVALIDATE_SERIES,
    NEW_PACKET
} from './actions';

const initial_state = {
    recent: {
        seriesTags   : {
            measurement: "wxpackets",
            platform   : "default_platform",
            stream     : "default_stream"
        },
        didInvalidate: false,
        isFetching   : false,
        maxAge       : 300000,
        packets      : []
    },
    last27: {
        seriesTags   : {
            measurement: "wxrecords",
            platform   : "default_platform",
            stream     : "default_stream"
        },
        didInvalidate: false,
        isFetching   : false,
        maxAge       : 97200000,           // = 27 hours in milliseconds
        packets      : []
    }
};

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

function selectedSeries(state = "recent", action) {
    switch (action.type) {
        case SELECT_SERIES:
            return action.seriesName;
        default:
            return state;
    }
}

function reduceSeries(state = {}, action) {
    const seriesName = action.seriesName;

    switch (action.type) {
        case INVALIDATE_SERIES:
            return {
                ...state,
                didInvalidate: true
            };
        case FETCH_SERIES_REQUEST:
            return {
                ...state,
                didInvalidate: false,
                isFetching   : true
            };
        case FETCH_SERIES_SUCCESS:
            return {
                ...state,
                seriesTags   : action.seriesTags,
                didInvalidate: false,
                isFetching   : false,
                maxAge       : action.maxAge,
                packets      : action.packets,
                lastUpdated  : action.receivedAt
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

function seriesBySeriesName(state = initial_state, action) {
    switch (action.type) {
        case INVALIDATE_SERIES:
        case FETCH_SERIES_REQUEST:
        case FETCH_SERIES_SUCCESS:
        case NEW_PACKET:
            return Object.assign({}, state, {
                [action.seriesName]: reduceSeries(state[action.seriesName], action)
            });
        default:
            return state;
    }
}

const rootReducer = combineReducers({
                                        selectedSeries,
                                        seriesBySeriesName
                                    });

export default rootReducer;