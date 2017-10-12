/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Useful small utilities.
 */
'use strict';

const url = require('url');
const normalizeUrl = require('normalize-url');

var locationPath = function (originalUrl, protocol, host, name) {
    var base_pathname = url.parse(originalUrl).pathname;
    var fullpath = url.format({
                                  protocol: protocol,
                                  host    : host,
                                  pathname: base_pathname + '/' + name
                              });
    return normalizeUrl(fullpath);
};

// Given a request header and a name, form a new endpoint
var resourcePath = function (req, name) {
    return locationPath(req.originalUrl, req.protocol, req.get('host'), name);
};

var fromError = function (code, err) {
    var e = {};
    e.message = err.message;
    e.code = code;
    if (err.description) {
        e.description = err.description;
    }
    return e;
};

// Create a deep packet from a set of parameters.
var create_deep_packet = function (measurement, platform, stream, timestamp, fields) {
    let packet = {
        'timestamp'  : timestamp,
        'measurement': measurement,
        'tags'       : {'platform': platform, 'stream': stream},
        'fields'     : fields
    };
    return packet;
};

// Convert a flat_packet into a deep packet
var flat_to_deep = function (flat_packet) {
    let deep_packet = {
        'tags'  : {},
        'fields': {}
    };

    for (let key in flat_packet) {
        if (key === 'platform')
            deep_packet['tags']['platform'] = flat_packet.platform;
        else if (key === 'stream')
            deep_packet['tags']['stream'] = flat_packet.stream;
        else if (key === 'time')
            // Convert timestamp from string to a number
            deep_packet['timestamp'] = +(flat_packet['time'].getNanoTime());
        else
            deep_packet['fields'][key] = flat_packet[key];
    }
    return deep_packet;
};

// Convert from InfluxDB "epoch" notation to milliseconds
var epoch_to_ms = function (epoch) {
    if (epoch.endsWith('ms')) {
        return +epoch.slice(0, -2);
    } else if (epoch.endsWith('s')) {
        return +epoch.slice(0, -1) * 1000;
    } else if (epoch.endsWith('m')) {
        return +epoch.slice(0, -1) * 60000;
    } else if (epoch.endsWith('h')) {
        return +epoch.slice(0, -1) * 3600000;
    } else if (epoch.endsWith('d')) {
        return +epoch.slice(0, -1) * 24 * 3600000;
    } else {
        throw new Error(`Unrecognized epoch ${epoch}`);
    }
};

// Given a measurement configuration and measurement name, form
// the "from" part of an InfluxDB query
var get_query_from = function (measurement, measurement_config) {
    let rp = '';
    let db = '';
    if (measurement_config) {
        if ('rp' in measurement_config) {
            rp = `"${measurement_config.rp}".`;
        }
        if ('database' in measurement_config) {
            db = `"${measurement_config.database}".`;
            if (!rp) rp = '.';
        }
    }
    let from_clause = db + rp + measurement;
    return from_clause;
};


module.exports = {
    locationPath      : locationPath,
    resourcePath      : resourcePath,
    fromError         : fromError,
    create_deep_packet: create_deep_packet,
    flat_to_deep      : flat_to_deep,
    epoch_to_ms       : epoch_to_ms,
    get_query_from    : get_query_from
};
