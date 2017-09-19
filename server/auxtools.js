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
        host: host,
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
        'timestamp': timestamp,
        'measurement': measurement,
        'tags': {'platform': platform, 'stream': stream},
        'fields': fields
    };
    return packet;
};

// Convert a flat_packet into a deep packet
var flat_to_deep = function (flat_packet) {
    let deep_packet = {
        'tags': {},
        'fields': {}
    };

    for (let key in flat_packet) {
        if (key === 'platform')
            deep_packet['tags']['platform'] = flat_packet.platform;
        else if (key === 'stream')
            deep_packet['tags']['stream'] = flat_packet.stream;
        else if (key === 'time')
            // timestamp will be a string. Maybe we want a number?
            deep_packet['timestamp'] = flat_packet['time'].getNanoTime();
        else
            deep_packet['fields'][key] = flat_packet[key];
    }
    return deep_packet;
};


module.exports = {
    locationPath: locationPath,
    resourcePath: resourcePath,
    fromError: fromError,
    create_deep_packet : create_deep_packet,
    flat_to_deep : flat_to_deep
};
