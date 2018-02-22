/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

'use strict';
const moment       = require('moment');
const _            = require('lodash');
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

    /**
     * Insert a packet into the database
     * @param {string} measurement - The name of the measurement into which the packet is to be inserted.
     * @param {string} deep_packet - The deep packet to be inserted
     * @returns {promise<DeepPacket>} - A promise to insert the packet. The promise resolves to the final,
     * inserted packet. Its fields may have been modified.
     */
    insert_packet(measurement, deep_packet) {

        // Make sure the packet has a timestamp.
        if (deep_packet.timestamp == null)
            return Promise.reject(new Error("No timestamp"));
        if (deep_packet.measurement && deep_packet.measurement !== measurement) {
            return Promise.reject(new Error("Value of 'measurement' in packet does not match given value."));
        }

        // Make a copy of the packet, filtering out any nulls because InfluxDB will reject them.
        const final_packet = {
            ...deep_packet,
            fields: Object.keys(deep_packet.fields)
                          .filter(k => deep_packet.fields[k] != null)
                          .reduce((f, k) => {
                              f[k] = deep_packet.fields[k];
                              return f;
                          }, {}),
        };

        return this.influx.writeMeasurement(measurement, [final_packet], this._get_write_options(measurement))
                   .then(() => {
                       return Promise.resolve(final_packet);
                   });
    }

    find_packet(measurement, timestamp, {platform = undefined, stream = undefined} = {}) {

        const from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let query_string = `SELECT * FROM ${from_clause} WHERE time=${timestamp}ms`;
        if (platform)
            query_string += ` AND platform='${platform}'`;
        if (stream)
            query_string += ` AND stream='${stream}'`;
        return this.influx
                   .queryRaw(query_string, {precision: 'ms'})
                   .then(results => {
                       const packet_arrays = auxtools.raws_to_deeps(results.results);
                       return Promise.resolve(packet_arrays[0]);
                   });
    }

    /**
     * Return an array of packets that satisfy a query, possibly aggregating and grouping by time.
     * @param {string} measurement - The measurement name
     * @param {object} options - An options object.
     * @param {string|undefined} options.platform - Select by platform. Otherwise, all platforms
     * @param {string|undefined} options.stream - Select by stream. Otherwise, all streams.
     * @param {number|undefined} options.start_time - Only times greater than this value will be included. In
     *     milliseconds
     * @param {number|undefined} options.stop_time - Only times less than or equal to this value will be included. In
     *     milliseconds.
     * @param {number|undefined} options.limit - The max number of packets to be returned. Default is all packets.
     * @param {string|undefined} options.direction - The sorting direction (by time). Either 'asc' or 'desc'.
     * @param {string|undefined} options.group - If not-null, group by time. The time interval should be something
     *     like '1h' or '15m'. See https://goo.gl/6fhBrD. If given, then a start
     *     and stop time must also be specified and an aggregation will be done.
     *     Default is no grouping.
     * @param {object[]} options.aggregates - If non-null, do an aggregation query. This array holds the type of
     *     aggregation to be used for each observation type.
     * @param {string} options.aggregates[].obs_type - The observation type (e.g., "out_temperature")
     * @param (string} options.aggregates[].subsample - The aggregation (e.g., "avg(out_temperature)" to be used for
     *     this type.
     * @returns {Promise<object[]>} - A promise to return an array of packets.
     */
    find_packets(measurement, {
        platform = undefined, stream = undefined,
        start_time = undefined, stop_time = undefined,
        limit = undefined, direction = 'asc',
        group = undefined,
        aggregates = undefined,
    } = {}) {

        /*
         * Note added 19-Feb-2018:
         *
         * Unfortunately, while the following strategy for grouping by time is efficient, it is not
         * entirely accurate. The reason is a difference of opinion on whether a timestamp represents
         * the end of an interval (WeeWX's assumption), or the beginning (InfluxDB's).
         *
         * With the WeeWX strategy, to find the aggregates in a five minute interval, you must select greater than the
         * starting time, and less than *or equal to* the ending time. Because of this, a packet
         * that lies precisely on the end of the five minute boundary will get included.
         *
         * However, InfluxDB assumes that this last packet is actually part of the *next* five
         * minute interval, and thus in an entirely different "group by" bin. So, it won't include it.
         *
         * With the new "subsampling" function, it might not be hard, nor too slow, to do it in the
         * application.
         */

        // TODO: Look into using the subsampling function to do group by time queries.

        if (group && start_time == null && stop_time == null) {
            return Promise.reject(new Error("Aggregation by time requires a start and/or stop time"));
        }

        // Because InfluxDB timestamps aggregated intervals with the *start* of the interval,
        // and we require the end, we have to modify the timestamp. This requires the stop time.
        if (aggregates && stop_time == null) {
            return Promise.reject(new Error("Aggregation requires a stop time"));
        }

        // Group by time requested. This requires an aggregation strategy.
        // Supply one if none was given.
        if (group && aggregates == null) {
            aggregates = obs_types;
        }

        // If aggregation was specified, get the aggregation clause. This will be something like
        // "avg(out_temperature) as out_temperature,SUM(rain_rain) as rain_rain, ..."
        const agg_clause  = aggregates == null ? '*' : sub_sampling.form_agg_clause(aggregates, true);
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

        if (group) {
            query_string += ` GROUP BY time(${group})`;
        }

        // A single value is returned if we are aggregating without grouping by time,
        // so no ORDER BY is needed. Otherwise, include it.
        if (!aggregates || group) {
            query_string += ` ORDER BY time ${direction}`;
        }

        if (limit) {
            query_string += ` LIMIT ${limit}`;
        }

        return this.influx
                   .queryRaw(query_string, {precision: 'ms'})
                   .then(results => {
                       const packet_arrays = auxtools.raws_to_deeps(results.results);

                       // If we are aggregating, but not grouping by time, then there are some special
                       // cases to take care of.
                       if (aggregates && !group) {
                           // Was anything returned?
                           if (packet_arrays[0].length == 0) {
                               // No. Return an empty array
                               return Promise.resolve([]);
                           } else if (packet_arrays[0].length == 1) {
                               // There is a single packet, which is what we expected.
                               // Its timestamp should be the *end* of the interval
                               return Promise.resolve([
                                                          {
                                                              ...packet_arrays[0][0],
                                                              timestamp: stop_time,
                                                          },
                                                      ]);
                           }
                           // If there is more than one packet, something went wrong
                           return Promise.reject(
                               new Error("More than one packet returned despite aggregating over time"),
                           );

                       }
                       // We are not aggregating, or we're grouping by time.
                       // If we're grouping by time, we need to shift the timestamps to the *end*
                       // of each interval
                       if (group){
                           const shift = auxtools.epoch_to_ms(group)
                           const final = packet_arrays[0].map(packet =>{
                               packet.timestamp += shift;
                           })
                           return Promise.resolve(final);
                       }
                       return Promise.resolve(packet_arrays[0]);
                   });
    }

    delete_packet(measurement, timestamp, {platform = undefined, stream = undefined} = {}) {

        const from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        let delete_stmt = `DELETE FROM ${from_clause} WHERE time=${timestamp}ms`;
        if (platform)
            delete_stmt += ` AND platform='${platform}'`;
        if (stream)
            delete_stmt += ` AND stream='${stream}'`;
        return this.influx.queryRaw(delete_stmt);
    }

    get_measurement_info(measurement) {
        const from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        return this.influx.query(`SHOW SERIES FROM ${from_clause};`)
                   .then(result_set => {
                       // Convert the  rather awkward InfluxDB notation into something more useful
                       return result_set.map((series) => {
                           // Strip off the returned measurement, keeping the rest of the string
                           const [result_measurement, ...rest] = series.key.split(',');
                           if (result_measurement !== measurement) {
                               throw new Error(`Internal error in get_measurement_info(): ` +
                                               `'${result_measurement}' != '${measurement}'`);
                           }
                           // Convert InfluxDB's notation into something more Javascripty.
                           return rest.reduce((f, pair) => {
                               const [key, value] = pair.split('=');
                               f[key]             = value;
                               return f;
                           }, {});
                       });
                   });
    }

    get_first_timestamp(measurement, {platform, stream} = {}) {
        return this.find_packets(measurement, {platform, stream, limit: 1, direction: 'asc'})
                   .then(packets => {
                       return packets.length ? packets[0].timestamp : undefined;
                   });
    }

    get_last_timestamp(measurement, {platform, stream} = {}) {
        return this.find_packets(measurement, {platform, stream, limit: 1, direction: 'desc'})
                   .then(packets => {
                       return packets.length ? packets[0].timestamp : undefined;
                   });
    }

    delete_measurement(measurement) {
        const db = auxtools.getNested(['measurement_config', measurement, 'database'], this);
        return this.influx.dropMeasurement(measurement, db);
    }

    run_stats(measurement, stats_specs, {
        platform = undefined, stream = undefined,
        now = undefined, span = 'day',
    } = {}) {
        const now_moment  = now ? moment(+now) : moment();
        let start         = +now_moment.startOf(span);
        let stop          = +now_moment.endOf(span);
        let queries       = [];
        let ordering      = [];
        const from_clause = auxtools.get_query_from(measurement, this.measurement_config[measurement]);

        // First, build all the queries that will be needed.
        // One for each measurement and aggregation type
        for (let stats_spec of stats_specs) {
            const obs_type = stats_spec.obs_type;
            const stats    = stats_spec.stats;
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

                       // If this measurement has timestamps marking the *beginning* of an interval instead
                       // of the more normal end, shift the timestamp.
                       const timeshift = this._get_timeshift(measurement);

                       // This will be what gets returned:
                       let final_results = {};

                       // Process the result set, one query at a time
                       for (let i = 0; i < result_set.results.length; i++) {

                           const obs_type = ordering[i][0];
                           const agg_type = ordering[i][1];
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
                           const result = result_set.results[i];
                           // Was there a result for this observation and aggregation type?
                           // If so, process it.
                           if (result.series) {
                               // The raw query returns results as a column of names, and an
                               // array of result rows.
                               let time, agg_name, agg_value;
                               // Go through this result finding the time, aggregation type and value
                               for (let col = 0; col < result.series[0].columns.length; col++) {
                                   const name = result.series[0].columns[col];
                                   const val  = result.series[0].values[0][col];
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
            precision      : 'ms',
        };
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
