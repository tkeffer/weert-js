/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

const auxtools = require('../auxtools');

/*
 * Class to manage the InfluxDB database
 */

class MeasurementManager {

    constructor(influx, config) {
        this.influx = influx;
        this.measurement_config = config;
    }

    delete_measurement(measurement) {
        return this.influx.dropMeasurement(measurement);
    }

    insert_packet(measurement, deep_packet) {

        // Make sure the packet has a timestamp.
        if (deep_packet.timestamp === undefined)
            return Promise.reject(new Error("No timestamp"));
        if (deep_packet.measurement && deep_packet.measurement !== measurement) {
            return Promise.reject(new Error("Value of 'measurement' in packet does not match given value."));
        }
        // Filter out any nulls because InfluxDB will reject them.
        // This will mutate deep_packet!!
        for (let k in deep_packet.fields) {
            if (deep_packet.fields[k] === null)
                delete deep_packet.fields[k];
        }
        return this.influx
                   .writeMeasurement(measurement, [deep_packet],
                                     this._get_write_options(measurement));
    }

    find_packet(measurement, timestamp, {platform = undefined, stream = undefined} = {}) {

        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let query_string = `SELECT * FROM ${from_clause} WHERE time=${timestamp}`;
        if (platform)
            query_string += ` AND platform='${platform}'`;
        if (stream)
            query_string += ` AND stream='${stream}'`;
        return this.influx
                   .query(query_string)
                   .then(results => {
                       let packet;
                       // Return only the first result
                       if (results[0] !== undefined) {
                           packet = auxtools.flat_to_deep(results[0]);
                       }
                       return Promise.resolve(packet);
                   });
    }

    find_packets(measurement, {
        platform = undefined, stream: stream = undefined,
        start_time = undefined, stop_time = undefined,
        limit = undefined, direction = 'asc'
    } = {}) {

        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        var query_string;
        if (start_time) {
            if (stop_time)
                query_string = `SELECT * FROM ${from_clause} WHERE time > ${start_time} AND time <= ${stop_time}`;
            else
                query_string = `SELECT * FROM ${from_clause} WHERE time > ${start_time}`;
        } else {
            if (stop_time)
                query_string = `SELECT * FROM ${from_clause} WHERE time <= ${stop_time}`;
            else
                query_string = `SELECT * FROM ${from_clause}`;
        }

        if (platform) {
            if (query_string.includes('WHERE'))
                query_string += ` AND platform = '${platform}'`;
            else
                query_string += ` WHERE platform = '${platform}'`;
        }

        if (stream) {
            if (query_string.includes('WHERE'))
                query_string += ` AND stream = '${stream}'`;
            else
                query_string += ` WHERE stream = '${stream}'`;
        }

        query_string += ` ORDER BY time ${direction}`;

        if (limit) {
            query_string += ` LIMIT ${limit}`;
        }

        return this.influx
                   .query(query_string)
                   .then(result => {
                       let deep_result = [];
                       for (let i in result) {
                           deep_result[i] = auxtools.flat_to_deep(result[i]);
                       }
                       return Promise.resolve(deep_result);
                   });
    }

    delete_packet(measurement, timestamp, {platform = undefined, stream = undefined} = {}) {

        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let delete_stmt = `DELETE FROM ${from_clause} WHERE time=${timestamp}`;
        if (platform)
            delete_stmt += ` AND platform='${platform}'`;
        if (stream)
            delete_stmt += ` AND stream='${stream}'`;
        return this.influx.query(delete_stmt);
    }

    get_measurement_info(measurement) {
        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let query = `SHOW SERIES FROM ${from_clause};`;
        return this.influx.query(query);
    }

    delete_measurement(measurement) {
        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let delete_stmt = `DROP MEASUREMENT ${from_clause};`;
        return this.influx.query(delete_stmt);
    }

    _get_write_options(measurement) {
        let rp = undefined;
        let db = undefined;
        if (measurement in this.measurement_config) {
            rp = this.measurement_config[measurement].rp;
            db = this.measurement_config[measurement].database;
        }
        return {
            retentionPolicy: rp,
            database       : db
        };
    }
}

module.exports = MeasurementManager;