/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

/*
 * Class to manage the InfluxDB database
 */

class MeasurementManager {

    constructor(influx, options) {
        this.influx = influx;
    }

    insert_packet(measurement, deep_packet) {

        const wrapped = [deep_packet];
        return this.influx
            .writeMeasurement(measurement, wrapped);
    }

    find_packet(measurement, timestamp, platform = undefined, stream = undefined) {

        let query_string = `SELECT * FROM ${measurement} WHERE time=${timestamp}`;
        if (platform)
            query_string += ` AND platform=${platform}`;
        if (stream)
            query_string += ` AND stream=${stream}`;
        console.log('query_string=', query_string);
        return this.influx
            .query(query_string)
            .then(results => {
                return Promise.resolve(results[0]);
            });
    }

    find_packets(measurement, platform = undefined, stream = undefined,
                 start_time = undefined, stop_time = undefined,
                 limit = undefined, sort_direction = 'asc') {
        var query_string;
        if (start_time) {
            if (stop_time)
                query_string = `SELECT * FROM ${measurement} WHERE time > ${start_time} AND time <= ${stop_time}`;
            else
                query_string = `SELECT * FROM ${measurement} WHERE time > ${start_time}`;
        } else {
            if (stop_time)
                query_string = `SELECT * FROM ${measurement} WHERE time <= ${stop_time}`;
            else
                query_string = `SELECT * FROM ${measurement}`;
        }

        if (platform) {
            if (query_string.includes('WHERE'))
                query_string += ` AND platform = '${platform}'`;
            else
                query_string += ` WHERE platform = '${platform}'`;
        }

        if (stream) {
            if (query_string.includes('WHERE'))
                query_string += ` AND platform = '${stream}'`;
            else
                query_string += ` WHERE platform = '${stream}'`;
        }

        query_string += ` ORDER BY time ${sort_direction}`;

        if (limit) {
            query_string += ` LIMIT ${limit}`;
        }

        console.log('query_string=', query_string);
        return this.influx
            .query(query_string)
            .then(results => {
                console.log('results from packet query=', results);
                return Promise.resolve(results);
            });
    }

    delete_packet(measurement, timestamp, platform = undefined, stream = undefined) {
        let delete_stmt = `DELETE FROM ${measurement} WHERE time=${timestamp}`;
        if (platform)
            delete_stmt += ` AND platform=${platform}`;
        if (stream)
            delete_stmt += ` AND stream=${stream}`;
        return this.influx.query(delete_stmt);
    }
}

module.exports = MeasurementManager;