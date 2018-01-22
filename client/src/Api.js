/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import * as faye from 'faye';

const fayeEndpoint = '/api/v1/faye';

module.exports = {

    getPackets: function (seriesTags, maxAge) {

        const since = Date.now() - maxAge;

        const url      = `http://${window.location.host}/api/v1/measurements/${seriesTags.measurement}/packets`;
        // TODO: Should cover the case where platform and stream are undefined.
        const params   = `?platform=${seriesTags.platform}&stream=${seriesTags.stream}&start=${since}`;
        const full_url = url + params;

        // TODO: Should probably add a timeout
        return fetch(full_url)
            .then(response => {
                if (!response.ok)
                    return Promise.reject(new Error(response.statusText));
                return response.json();
            });
    },

    subscribe: function (seriesTags, callback) {
        // TODO: this puts all platforms and streams in the same channel. They should be separated.
        const faye_client = new faye.Client("http://" + window.location.host + fayeEndpoint);
        return faye_client.subscribe("/" + seriesTags.measurement, callback);
    },

    unsubscribe: function (subscription) {
        subscription.cancel();
    }

};