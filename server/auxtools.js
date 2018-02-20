/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Useful small utilities.
 */
'use strict';

const url          = require('url');
const normalizeUrl = require('normalize-url');

let locationPath = function (originalUrl, protocol, host, name) {
    let base_pathname = url.parse(originalUrl).pathname;
    let fullpath      = url.format({
                                       protocol: protocol,
                                       host    : host,
                                       pathname: base_pathname + '/' + name
                                   });
    return normalizeUrl(fullpath);
};

// Given a request header and a name, form a new endpoint
let resourcePath = function (req, name) {
    return locationPath(req.originalUrl, req.protocol, req.get('host'), name);
};

let fromError = function (code, err) {
    let e     = {};
    e.message = err.message;
    e.code    = code;
    if (err.description) {
        e.description = err.description;
    }
    return e;
};

// Create a deep packet from a set of parameters.
let create_deep_packet = function (measurement, platform, stream, timestamp, fields) {
    let packet = {
        'timestamp'  : timestamp,
        'measurement': measurement,
        'tags'       : {'platform': platform, 'stream': stream},
        'fields'     : fields
    };
    return packet;
};

// Convert a flat_packet into a deep packet
let flat_to_deep = function (flat_packet) {
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

// Convert columns and a row to a single deep packet
let raw_to_deep = function (columns, row) {
    let deep_packet = {
        'tags'  : {},
        'fields': {}
    };

    for (let i = 0; i < columns.length; i++) {
        let type = columns[i];
        if (type === 'platform')
            deep_packet['tags']['platform'] = row[i];
        else if (type === 'stream')
            deep_packet['tags']['stream'] = row[i];
        else if (type === 'time')
        // Convert timestamp from string to a number
            deep_packet['timestamp'] = +row[i];
        else
            deep_packet['fields'][type] = row[i];
    }
    return deep_packet;
};

// Convert a raw InfluxDB result set into an array of deep packet arrays.
let raws_to_deeps = function (results) {
    let massaged = [];
    for (let result of results) {
        if (result.series) {
            let deep_array = result.series[0].values.map(
                function (row) {return raw_to_deep(result.series[0].columns, row);}
            );
            massaged.push(deep_array);
        } else {
            massaged.push([]);
        }
    }
    return massaged;
};

// Convert from InfluxDB "epoch" notation to milliseconds
let epoch_to_ms = function (epoch) {
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
let get_query_from = function (measurement, measurement_config) {
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

let isDevelopment = function () {
    return !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
};

// Access a deeply nested value, with thanks to A. Sharif (https://goo.gl/f924sP)
let getNested = function (path, obj) {
    return path.reduce((xs, x) =>
                           ((xs != null) && (xs[x] != null)) ? xs[x] : undefined, obj);
};


module.exports = {
    locationPath,
    resourcePath,
    fromError,
    create_deep_packet,
    flat_to_deep,
    epoch_to_ms,
    get_query_from,
    raw_to_deep,
    raws_to_deeps,
    isDevelopment,
    getNested,
};
