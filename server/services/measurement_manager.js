/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

'use strict';

const moment = require('moment');

const auxtools     = require('../auxtools');
const obs_types    = require('../config/obs_types');
const sub_sampling = require('./subsampling');

/*
 * Class to manage the InfluxDB database
 */

class MeasurementManager {

    constructor(influx, measurement_config) {
        this.influx             = influx;
        this.measurement_config = measurement_config;
    }

    insert_packet(measurement, deep_packet) {

        // Make sure the packet has a timestamp.
        if (deep_packet.timestamp == null)
            return Promise.reject(new Error("No timestamp"));
        if (deep_packet.measurement && deep_packet.measurement !== measurement) {
            return Promise.reject(new Error("Value of 'measurement' in packet does not match given value."));
        }

        const timeshift = this._get_timeshift(measurement);

        // Make a copy of the packet, filtering out any nulls because InfluxDB will reject them.
        // Also, if this measurement is the result of a CQ, its timestamps will mark the
        // *beginning* of an interval, not the end. So, before inserting the packet, change
        // the timestamp to the beginning of the interval.
        const final_packet = {
            ...deep_packet,
            timestamp: deep_packet.timestamp - timeshift,
            fields   : Object.keys(deep_packet.fields)
                             .filter(k => deep_packet.fields[k] != null)
                             .reduce((f, k) => {
                                 f[k] = deep_packet.fields[k];
                                 return f;
                             }, {})
        };

        return this.influx
                   .writeMeasurement(measurement, [final_packet],
                                     this._get_write_options(measurement));
    }

    find_packet(measurement, timestamp, {platform = undefined, stream = undefined} = {}) {

        // If this measurement has timestamps marking the *beginning* of an interval instead
        // of the more normal end, shift the timestamp.
        const timeshift = this._get_timeshift(measurement);
        timestamp -= timeshift;
        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let query_string = `SELECT * FROM ${from_clause} WHERE time=${timestamp}ms`;
        if (platform)
            query_string += ` AND platform='${platform}'`;
        if (stream)
            query_string += ` AND stream='${stream}'`;
        return this.influx
                   .queryRaw(query_string, {precision: 'ms'})
                   .then(results => {
                       let packet_arrays = auxtools.raws_to_deeps(results.results);
                       for (let packet of packet_arrays[0]) {
                           if (packet) {
                               this._shift_timestamp(measurement, packet);
                           }
                       }
                       return Promise.resolve(packet_arrays[0]);
                   });
    }

    /**
     * Return an array of packets that satisfy a query, possibly aggregating them and grouping by time.
     * @param {string} measurement - The measurement name
     * @param {string|undefined} platform - Select by platform. Otherwise, all platforms
     * @param {string|undefined} stream - Select by stream. Otherwise, all streams.
     * @param {number|undefined} start_time - Only times greater than this value will be included. In milliseconds
     * @param {number|undefined} stop_time - Only times less than or equal to this value will be included. In
     *     milliseconds.
     * @param {number|undefined} limit - The max number of packets to be returned.
     * @param {string|undefined} direction - The sorting direction (by time). Either 'asc' or 'desc'.
     * @param {string|undefined} group_by - If not-null, perform an aggregation query, grouping by time.
     *                            The time interval should be something like '1h' or '15m'. See https://goo.gl/6fhBrD
     *                            Default is no aggregation.
     * @param {object[]} aggregates - If doing an aggregation query, this array holds the type of
     *                            aggregation to be used for each observation type.
     * @param {string} aggregates[].obs_type - The observation type (e.g., "out_temperature")
     * @param (string} aggregates[].subsample - The aggregation (e.g., 'avg') to be used for this type.
     * @returns {Promise<object[]>} - A promise to return an array of packets.
     */
    find_packets(measurement, {
        platform = undefined, stream = undefined,
        start_time = undefined, stop_time = undefined,
        limit = undefined, direction = 'asc',
        group_by = undefined,
        aggregates = obs_types,
    } = {}) {

        /*
         * Note added 19-Feb-2018:
         *
         * Unfortunately, while the following strategy for grouping by time is efficient, it is not
         * entirely accurate. The reason is a difference of opinion on whether a timestamp represents
         * the end of an interval (WeeWX's assumption), or the beginning (InfluxDB's).
         *
         * With the WeeWX strategy, to find the aggregates in a five minute interval, you must select greater than the
         * starting time, and less than *or equal to* the ending time. Because of this, there may be a packet
         * that lies precisely on the end of the five minute boundary, which gets included.
         *
         * When you then group by 5 minutes, InfluxDB assumes that this last packet is actually part of
         * the *next* five minute interval, and thus in an entirely different "group by" bin.
         *
         * No easy fix, except to run the grouping in the application, instead of the database. This is likely
         * to be very slow.
         */

        if (group_by && start_time == null && stop_time == null) {
            return Promise.reject(new Error("Aggregation requires a start and/or stop time"));
        }

        // If this measurement has timestamps marking the *beginning* of an interval instead
        // of the more normal end, shift the timestamps.
        const timeshift = this._get_timeshift(measurement);
        if (start_time) start_time -= timeshift;
        if (stop_time) stop_time -= timeshift;

        // If aggregation was specified, get the aggregation clause. This will be something like
        // "avg(out_temperature) as out_temperature,SUM(rain_rain) as rain_rain, ..."
        const agg_clause  = group_by ? sub_sampling.form_agg_clause(aggregates, true) : '*';
        const from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let query_string;
        if (start_time) {
            if (stop_time)
                query_string = `SELECT ${agg_clause} FROM ${from_clause} WHERE time > ${start_time}ms AND time <= ${stop_time}ms`;
            else
                query_string = `SELECT ${agg_clause} FROM ${from_clause} WHERE time > ${start_time}ms`;
        } else {
            if (stop_time)
                query_string = `SELECT ${agg_clause} FROM ${from_clause} WHERE time <= ${stop_time}ms`;
            else
                query_string = `SELECT ${agg_clause} FROM ${from_clause}`;
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

        if (group_by) {
            query_string += ` GROUP BY time(${group_by})`;
        }

        query_string += ` ORDER BY time ${direction}`;

        if (limit) {
            query_string += ` LIMIT ${limit}`;
        }

        return this.influx
                   .queryRaw(query_string, {precision: 'ms'})
                   .then(results => {
                       let packet_arrays = auxtools.raws_to_deeps(results.results);
                       for (let packet of packet_arrays[0]) {
                           if (packet) {
                               this._shift_timestamp(measurement, packet);
                           }
                       }
                       return Promise.resolve(packet_arrays[0]);
                   });
    }

    delete_packet(measurement, timestamp, {platform = undefined, stream = undefined} = {}) {

        // If this measurement has timestamps marking the *beginning* of an interval instead
        // of the more normal end, shift the timestamp.
        const timeshift = this._get_timeshift(measurement);
        timestamp -= timeshift;

        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let delete_stmt = `DELETE FROM ${from_clause} WHERE time=${timestamp}ms`;
        if (platform)
            delete_stmt += ` AND platform='${platform}'`;
        if (stream)
            delete_stmt += ` AND stream='${stream}'`;
        return this.influx.queryRaw(delete_stmt);
    }

    get_measurement_info(measurement) {
        let from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let query = `SHOW SERIES FROM ${from_clause};`;
        return this.influx.query(query);
    }

    delete_measurement(measurement) {
        const db = auxtools.getNested(['measurement_config', measurement, 'database'], this);
        return this.influx.dropMeasurement(measurement, db);
    }

    run_stats(measurement, stats_specs, {
        platform = undefined, stream = undefined,
        now = undefined, span = 'day'
    } = {}) {
        const now_moment  = now ? moment(+now) : moment();
        let start         = +now_moment.startOf(span);
        let stop          = +now_moment.endOf(span);
        let queries       = [];
        let ordering      = [];
        const from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        // If this measurement has timestamps marking the *beginning* of an interval instead
        // of the more normal end, shift the timestamp.
        const timeshift = this._get_timeshift(measurement);
        start -= timeshift;
        stop -= timeshift;

        // First, build all the queries that will be needed.
        // One for each measurement and aggregation type
        for (let stats_spec of stats_specs) {
            let obs_type = stats_spec.obs_type;
            let stats    = stats_spec.stats;
            if (stats) {
                for (let agg of stats) {
                    let agg_lc = agg.toLowerCase();
                    if (agg_lc === 'avg')
                        agg_lc = 'mean';
                    let query_string = `SELECT ${agg_lc}(${obs_type}) ` +
                                       `FROM ${from_clause} WHERE time>${start}ms AND time<=${stop}ms`;

                    if (platform)
                        query_string += ` AND platform = '${platform}'`;
                    if (stream)
                        query_string += ` AND stream = '${stream}'`;

                    queries.push(query_string);

                    // Remember the observation types and aggregation type for each query
                    ordering.push([obs_type, agg_lc]);
                }
            }
        }

        // Now run the query and process the results.
        return this.influx.queryRaw(queries, {precision: 'ms'})
                   .then(result_set => {

                       // This will be what gets returned:
                       let final_results = {};

                       // Process the result set, one query at a time
                       for (let i = 0; i < result_set.results.length; i++) {

                           let obs_type = ordering[i][0];
                           let agg_type = ordering[i][1];
                           // If we haven't seen this observation type before then initialize it
                           if (final_results[obs_type] === undefined)
                               final_results[obs_type] = {};
                           // Initialize the aggregation type
                           final_results[obs_type][agg_type] = {"value": null};
                           // Aggregation types 'count' and 'sum' do not have a timestamp
                           // associated with them.
                           if (agg_type !== 'count' && agg_type !== 'sum')
                               final_results[obs_type][agg_type]['timestamp'] = null;


                           // Simplify what follows by extracting this particular result
                           // out of the result set
                           let result = result_set.results[i];
                           // Was there a result for this observation and aggregation type?
                           // If so, process it.
                           if (result.series) {
                               // The raw query returns results as a column of names, and an
                               // array of result rows.
                               let time, agg_name, agg_value;
                               // Go through this result finding the time, aggregation type and value
                               for (let col = 0; col < result.series[0].columns.length; col++) {
                                   let name = result.series[0].columns[col];
                                   let val  = result.series[0].values[0][col];
                                   if (name === 'time')
                                       time = val;
                                   else {
                                       agg_name  = name;
                                       agg_value = val;
                                   }
                               }
                               if (agg_type !== agg_name) {
                                   throw new Error("Internal error. Aggregation types do not match");
                               }
                               // OK, we've found the aggregation value and time. Set the final result
                               // accordingly
                               final_results[obs_type][agg_type]['value'] = agg_value;
                               if (agg_type !== 'count' && agg_type !== 'sum')
                                   final_results[obs_type][agg_type]['timestamp'] = time + timeshift;
                           }
                       }
                       return Promise.resolve(final_results);
                   });
    }


    _get_write_options(measurement) {
        const rp = auxtools.getNested(['measurement_config', measurement, 'rp'], this);
        const db = auxtools.getNested(['measurement_config', measurement, 'database'], this);
        return {
            retentionPolicy: rp,
            database       : db,
            precision      : 'ms'
        };
    }

    _shift_timestamp(measurement, packet) {
        packet.timestamp += this._get_timeshift(measurement);
    }

    _get_timeshift(measurement) {
        // This is to correct a flaw in continuous queries. They timestamp their result with the
        // beginning of the aggregation period, while we want the end. So, for measurements
        // that are the result of a CQ, shift the time.
        let timeshift = auxtools.getNested(['measurement_config', measurement, 'timeshift'], this);
        if (timeshift == null)
            timeshift = 0;
        return timeshift;
    }
}

module.exports = MeasurementManager;