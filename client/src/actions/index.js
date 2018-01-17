import api from '../Api';

export const FETCH_SERIES_REQUEST = 'FETCH_SERIES_REQUEST';
export const FETCH_SERIES_SUCCESS = 'FETCH_SERIES_SUCCESS';
export const FETCH_SERIES_FAILURE = 'FETCH_SERIES_FAILURE';
export const SELECT_SERIES        = 'SELECT_SERIES';
export const INVALIDATE_SERIES    = 'INVALIDATE_SERIES';

export function selectSeries(seriesName) {
    return {
        type: SELECT_SERIES,
        seriesName,
    };
}

export function invalidateSeries(seriesName) {
    return {
        type: INVALIDATE_SERIES,
        seriesName
    };
}

function requestingSeries(seriesName) {
    return {
        type: FETCH_SERIES_REQUEST,
        seriesName,
    };
}

function receiveSeries(seriesName, seriesTags, maxAge, packets) {
    return {
        type      : FETCH_SERIES_SUCCESS,
        seriesName,
        seriesTags,
        maxAge,
        packets   : packets.map(packet => {
            // Flatten the packets:
            return {
                timestamp: packet.timestamp,
                ...packet.fields
            };
        }),
        receivedAt: Date.now()
    };
}

function fetchSeries(seriesName, seriesTags, maxAge) {
    return dispatch => {
        dispatch(requestingSeries(seriesName));
        return api.getPackets(seriesTags, maxAge)
                  .then(packets => dispatch(receiveSeries(seriesName, seriesTags, maxAge, packets)));
    };
}

function shouldFetchSeries(seriesState) {
    if (!seriesState) {
        return true;
    } else if (seriesState.isFetching) {
        return false;
    } else if (!seriesState.packets || !seriesState.packets.length) {
        return true;
    } else {
        return seriesState.didInvalidate;
    }
}

export function fetchSeriesIfNeeded(seriesName) {
    return (dispatch, getState) => {
        const seriesState = getState().packetsBySeriesName[seriesName];
        if (shouldFetchSeries(seriesState)) {
            return dispatch(fetchSeries(seriesName, seriesState.seriesTags, seriesState.maxAge));
        }
    };
}
