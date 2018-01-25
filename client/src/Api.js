/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import * as faye from 'faye';

const fayeEndpoint = '/api/v1/faye';

export function getPackets(seriesTags, maxAge) {

    const {measurement, platform, stream} = seriesTags;

    const since = Date.now() - maxAge;
    const url   = `http://${window.location.host}/api/v1/measurements/${measurement}/packets`;
    let params  = `?start=${since}`;
    if (platform) params += `&platform=${platform}`;
    if (stream) params += `&stream=${stream}`;

    const fullUrl = url + params;

    // TODO: Should probably add a timeout
    return fetch(fullUrl)
        .then(response => {
            if (!response.ok)
                return Promise.reject(new Error(response.statusText));
            return response.json();
        });
}

export function getStats(seriesTags, span) {

    const {measurement, platform, stream} = seriesTags;

    const url   = `http://${window.location.host}/api/v1/measurements/${measurement}/stats`;
    let params  = `?span=${span}`;
    if (platform) params += `&platform=${platform}`;
    if (stream) params += `&stream=${stream}`;

    const fullUrl = url + params;

    return fetch(fullUrl)
        .then(response => {
            if (!response.ok)
                return Promise.reject(new Error(response.statusText));
            return response.json();
        });
}


export function subscribe(seriesTags, callback) {
    // TODO: this puts all platforms and streams in the same channel. They should be separated.
    const faye_client = new faye.Client("http://" + window.location.host + fayeEndpoint);
    return faye_client.subscribe("/" + seriesTags.measurement, callback);
}

export function unsubscribe(subscription) {
    subscription.cancel();
}
