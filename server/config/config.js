/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Configuration information for WeeRT
 */
module.exports = {
    // Set to 0 (zero) for no debugging, 1 (one) for debugging.
    debug: 1,

    // Configuration info for the WeeRT server itself
    server: {
        port: 3000,
        api : '/api/v1'
    },

    // Information about connecting to the InfluxDB host
    influxdb: {
        host    : 'localhost',
        port    : 8086,
        username: 'root',
        password: 'root',
        database: 'weert',
        cq_delay: 5000
    },

    // Configuration for the Faye pub-sub facility
    faye:{
        endpoint: '/api/v1/faye'
    }
};