import * as api from '../Api';

export const SELECT_TIME_SCALE         = 'SELECT_TIME_SCALE';
export const SELECT_TIME_DETAIL        = 'SELECT_TIME_DETAIL';
export const FETCH_MEASUREMENT_REQUEST = 'FETCH_MEASUREMENT_REQUEST';
export const FETCH_MEASUREMENT_SUCCESS = 'FETCH_MEASUREMENT_SUCCESS';
export const FETCH_MEASUREMENT_FAILURE = 'FETCH_MEASUREMENT_FAILURE';
export const FETCH_STATS_REQUEST       = 'FETCH_STATS_REQUEST';
export const FETCH_STATS_SUCCESS       = 'FETCH_STATS_SUCCESS';
export const FETCH_STATS_FAILURE       = 'FETCH_STATS_FAILURE';
export const NEW_PACKET                = 'NEW_PACKET';


export function selectTimeScale(timeScale) {
    return {
        type: SELECT_TIME_SCALE,
        timeScale
    };
}

export function selectTimeDetail(timeDetail) {
    return {
        type: SELECT_TIME_DETAIL,
        timeDetail
    };
}

function requestingMeasurement(measurement) {
    return {
        type: FETCH_MEASUREMENT_REQUEST,
        measurement,
    };
}

function receiveMeasurement(measurement, tags, maxAge, aggregation, packets) {
    return {
        type   : FETCH_MEASUREMENT_SUCCESS,
        measurement,
        tags,
        maxAge,
        aggregation,
        packets: packets.map(packet => {
            // Flatten the packets:
            return {
                timestamp: packet.timestamp,
                ...packet.fields
            };
        }),
    };
}

function fetchMeasurement(measurement, tags, maxAge, aggregation) {
    return dispatch => {
        dispatch(requestingMeasurement(measurement));
        return api.getPackets(measurement, tags, maxAge, aggregation)
                  .then(packets => dispatch(receiveMeasurement(measurement, tags, maxAge, aggregation, packets)));
    };
}

function shouldFetchMeasurement(measurementState) {
    if (measurementState.isFetching) {
        return false;
    }
    return measurementState.packets && measurementState.packets.length;
}

export function fetchMeasurementIfNeeded(measurement) {
    return (dispatch, getState) => {
        const state            = getState();
        const {selectedTags}   = state;
        const measurementState = state.measurements[measurement];
        if (shouldFetchMeasurement(measurementState)) {
            const {maxAge, aggregation} = measurementState;
            return dispatch(fetchMeasurement(measurement,
                                             selectedTags,
                                             maxAge,
                                             aggregation));
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
        api.subscribe(measurement, tags, packet => {
            return dispatch(newPacket(measurement, packet));
        });
    };
};
