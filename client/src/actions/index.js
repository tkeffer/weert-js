import moment from 'moment/moment';

import * as api from '../Api';

export const SELECT_TAGS                = 'SELECT_TAGS';
export const SELECT_TIME_SPAN           = 'SELECT_TIME_SPAN';
export const SELECT_NEW_START_TIME      = 'SELECT_NEW_START_TIME';
export const SELECT_TIME_DETAIL         = 'SELECT_TIME_DETAIL';
export const START_NEW_TIMESPAN         = 'START_NEW_TIMESPAN';
export const FETCH_RECENT_IN_PROGRESS   = 'FETCH_RECENT_IN_PROGRESS';
export const FETCH_RECENT_SUCCESS       = 'FETCH_RECENT_SUCCESS';
export const FETCH_RECENT_FAILURE       = 'FETCH_RECENT_FAILURE';
export const FETCH_TIMESPAN_IN_PROGRESS = 'FETCH_TIMESPAN_IN_PROGRESS';
export const FETCH_TIMESPAN_SUCCESS     = 'FETCH_TIMESPAN_SUCCESS';
export const FETCH_TIMESPAN_FAILURE     = 'FETCH_TIMESPAN_FAILURE';
export const FETCH_STATS_REQUEST        = 'FETCH_STATS_REQUEST';
export const FETCH_STATS_SUCCESS        = 'FETCH_STATS_SUCCESS';
export const FETCH_STATS_FAILURE        = 'FETCH_STATS_FAILURE';
export const NEW_PACKET                 = 'NEW_PACKET';


export function selectTags(tags) {
    return {
        type: SELECT_TAGS,
        tags
    };
}

// Select a new time span, e.g., 'recent', 'day', 'month', to display
export function selectTimeSpan(timeSpan) {
    return {
        type: SELECT_TIME_SPAN,
        timeSpan
    };
}

// Select a new starting time for a time span. This allows changing the displayed date.
export function selectNewStartTime(timeSpan, start) {
    return {
        type: SELECT_NEW_START_TIME,
        timeSpan,
        start
    };
}

// Select a new time detail (e.g., 5, 10, 20 minutes) to display
export function selectTimeDetail(timeDetail) {
    return {
        type: SELECT_TIME_DETAIL,
        timeDetail
    };
}

// Issued at the start of a new day, week, month, year
export function startNewTimeSpan(timeSpan) {
    return {
        type: START_NEW_TIMESPAN,
        timeSpan
    };
}

// Issued when there is a fetch in progress for 'recent' packets
function fetchRecentInProgress() {
    return {
        type: FETCH_RECENT_IN_PROGRESS
    };
}

// Issued when there is a fetch in progress for time span packets ('day', 'week', etc.)
function fetchTimeSpanInProgress(timeSpan) {
    return {
        type: FETCH_TIMESPAN_IN_PROGRESS,
        timeSpan,
    };
}

function receiveRecent(packets) {
    return {
        type   : FETCH_RECENT_SUCCESS,
        packets: packets.map(packet => {
            // Flatten the packets:
            return {
                timestamp: packet.timestamp,
                ...packet.fields
            };
        }),
    };
}

function receiveTimeSpan(timeSpan, packets) {
    return {
        type   : FETCH_TIMESPAN_SUCCESS,
        timeSpan,
        packets: packets.map(packet => {
            // Flatten the packets:
            return {
                timestamp: packet.timestamp,
                ...packet.fields
            };
        }),
    };
}

function fetchRecent(measurement, tags, maxAge) {
    return dispatch => {
        dispatch(fetchRecentInProgress());
        const start = Date.now() - maxAge;
        return api.getPackets(measurement, tags, start)
                  .then(packets => dispatch(receiveRecent(packets)));
    };
}

function fetchTimeSpan(measurement, tags, timeSpan, start, aggregation) {
    return dispatch => {
        dispatch(fetchTimeSpanInProgress(timeSpan));
        const stop = getStopTime(start, timeSpan);
        return api.getPackets(measurement, tags, start, stop, aggregation)
                  .then(packets => dispatch(receiveTimeSpan(timeSpan, packets)));
    };
}

// Determine if we need to fetch some 'recent' packets.
function shouldFetchRecent(recentState, newMaxAge) {
    // If a fetch is in progress, don't do another fetch
    if (recentState.isFetching) {
        return false;
    }
    // If the maxAge doesn't match, we need to fetch
    if (recentState.maxAge !== newMaxAge)
        return true;
    // If we don't have any packets, we need to fetch
    return !(recentState.packets && recentState.packets.length);
}

// Determine if we need to fetch a time span.
function shouldFetchTimeSpan(timeSpanState, newStart, newAggregation) {
    // If a fetch is in progress, don't do another fetch
    if (timeSpanState.isFetching) {
        return false;
    }
    // If the start of the time span, or the aggregation, don't match, do a fetch
    if (timeSpanState.start !== newStart || timeSpanState.aggregation != newAggregation) {
        return true;
    }
    // If we don't have any packets for this time span, do a fetch
    return !(timeSpanState.packets && timeSpanState.packets.length);
}

export function fetchRecentIfNeeded(newMaxAge) {
    return (dispatch, getState) => {
        const state       = getState();
        const recentState = state['recent'];

        if (shouldFetchRecent(recentState, newMaxAge)) {
            const {selectedTags} = state;
            const {measurement}  = recentState;
            return dispatch(fetchRecent(measurement,
                                        selectedTags,
                                        newMaxAge));
        }
    };
}

export function fetchTimeSpanIfNeeded(timeSpan, newStart, newAggregation) {
    return (dispatch, getState) => {
        const state         = getState();
        const timeSpanState = state['timeSpans'][timeSpan];

        if (shouldFetchTimeSpan(timeSpanState, newStart, newAggregation)) {
            const {selectedTags} = state;
            const {measurement}  = timeSpanState;
            return dispatch(fetchTimeSpan(measurement,
                                          selectedTags,
                                          timeSpan,
                                          newStart,
                                          newAggregation));
        }
    };
}

function newPacket(measurement, packet) {
    return {
        type  : NEW_PACKET,
        measurement,
        packet: {
            timestamp: packet.timestamp,
            ...packet.fields
        }
    };
}

export function subscribeMeasurement(measurement, tags) {
    return (dispatch, getState) => {
        return api.subscribe(measurement, tags, packet => {
            return dispatch(newPacket(measurement, packet));
        });
    };
};

/*
 * Utility functions
 */

function getStopTime(start, timeSpan) {
    if (timeSpan)
        return moment(start).startOf(timeSpan).add(1, timeSpan);
    else
        return undefined;
}