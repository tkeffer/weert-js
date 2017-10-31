/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

const moment = require('moment');

const auxtools = require('../auxtools');

/*
 * Class to manage the InfluxDB database
 */

class MeasurementManager {

    constructor(influx, config) {
        this.influx             = influx;
        this.measurement_config = config;
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
                           this._shift_timestamp(measurement, packet);
                       }
                       return Promise.resolve(packet);
                   });
    }

    find_packets(measurement, {
        platform = undefined, stream = undefined,
        start_time = undefined, stop_time = undefined,
        limit = undefined, direction = 'asc'
    } = {}) {

        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let query_string;
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
                           this._shift_timestamp(measurement, deep_result[i]);
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
        let db;
        let measurement_config = this.measurement_config[measurement];
        if (measurement_config && 'database' in measurement_config) {
            db = measurement_config.database;
        }
        return this.influx.dropMeasurement(measurement, db);
    }


    run_stats(measurement, stats_specs, {
        platform = undefined, stream = undefined,
        now = undefined, span = 'day', timeshift = 0
    }) {
        let now_moment  = now ? moment(now / 1000000) : moment();
        let start       = now_moment.startOf(span) * 1000000;
        let stop        = now_moment.endOf(span) * 1000000;
        let queries     = [];
        let ordering    = [];
        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);


        for (let stats_spec of stats_specs) {
            let obs_type = stats_spec.obs_type;
            let stats    = stats_spec.stats;
            if (stats) {
                for (let agg of stats) {
                    let agg_lc = agg.toLowerCase();
                    if (agg_lc === 'avg')
                        agg_lc = 'mean';
                    // TODO: The time boundaries work for the results of a CQ, but not other sources
                    let query_string = `SELECT ${agg_lc}(${obs_type}) ` +
                                       `FROM ${from_clause} WHERE time>=${start} AND time<${stop}`;

                    if (platform)
                        query_string += ` AND platform = '${platform}'`;
                    if (stream)
                        query_string += ` AND stream = '${stream}'`;
                    queries.push(query_string);
                    ordering.push([obs_type, agg_lc]);
                }
            }
        }

        return this.influx.query(queries)
                   .then(q_results => {
                       let results = {};
                       for (let i = 0; i < ordering.length; i++) {
                           let obs_type = ordering[i][0];
                           let agg      = ordering[i][1];
                           if (q_results[i].length) {
                               if (results[obs_type] === undefined)
                                   results[obs_type] = {};
                               results[obs_type][agg] = {
                                   value: q_results[i][0][agg],
                               };
                               if (agg !== 'count' && agg !== 'sum')
                                   results[obs_type][agg]['timestamp'] = +q_results[i][0].time.getNanoTime() + timeshift;
                           }
                       }
                       return Promise.resolve(results);
                   });


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

    _shift_timestamp(measurement, packet) {
        // This is to correct a flaw in continuous queries. They timestamp their result with the
        // beginning of the aggregation period, while we want the end. So shift the time.
        if (this.measurement_config[measurement] && this.measurement_config[measurement].timeshift)
            packet.timestamp += this.measurement_config[measurement].timeshift;
    }
}

module.exports = MeasurementManager;