/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

'use strict';
const moment       = require('moment');
const _            = require('lodash');
const auxtools     = require('../auxtools');
const sub_sampling = require('./subsampling');

const default_aggregation_policy = require('../config/aggregate_policies');

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
     * @param {DeepPacket} deep_packet - The deep packet to be inserted
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

        const from_clause = this.get_query_from(measurement);

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
            aggregates = default_aggregation_policy;
        }

        // If aggregation was specified, get the aggregation clause. This will be something like
        // "avg(out_temperature) as out_temperature,SUM(rain_rain) as rain_rain, ..."
        const agg_clause  = aggregates == null ? '*' : sub_sampling.form_agg_clause(aggregates);
        const from_clause = this.get_query_from(measurement);

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
                       if (group) {
                           const shift = auxtools.epoch_to_ms(group);
                           const final = packet_arrays[0].map(packet => {
                               packet.timestamp += shift;
                           });
                           return Promise.resolve(final);
                       }
                       return Promise.resolve(packet_arrays[0]);
                   });
    }

    delete_packet(measurement, timestamp, {platform = undefined, stream = undefined} = {}) {

        const from_clause = this.get_query_from(measurement);

        let delete_stmt = `DELETE FROM ${from_clause} WHERE time=${timestamp}ms`;
        if (platform)
            delete_stmt += ` AND platform='${platform}'`;
        if (stream)
            delete_stmt += ` AND stream='${stream}'`;
        return this.influx.queryRaw(delete_stmt);
    }

    get_measurement_info(measurement) {
        const from_clause = this.get_query_from(measurement);

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
        const from_clause = this.get_query_from(measurement);

        // First, build all the queries that will be needed.
        // One for each measurement and aggregation type
        for (let obs_type of Object.keys(stats_specs)) {
            const stats    = stats_specs[obs_type];
            for (let agg of stats) {
                let agg_uc = agg.toUpperCase();
                if (agg_uc === 'AVG')
                    agg_uc = 'MEAN';
                let query_string = `SELECT ${agg_uc}(${obs_type}) ` +
                                   `FROM ${from_clause} WHERE time>${start}ms AND time<=${stop}ms`;
                if (platform)
                    query_string += ` AND platform = '${platform}'`;
                if (stream)
                    query_string += ` AND stream = '${stream}'`;
                queries.push(query_string);
                // Remember the observation types and aggregation type for each query
                ordering.push([obs_type, agg_uc.toLowerCase()]);
            }
        }
        // Now run the query and process the results.
        return this.influx.queryRaw(queries, {precision: 'ms'})
                   .then(result_set => {

                       // This will be what gets returned:
                       let stats_summary = {};

                       // Process the result set, one query at a time
                       for (let i = 0; i < result_set.results.length; i++) {

                           const [obs_type, agg_lc] = ordering[i];
                           // If we haven't seen this observation type before then initialize it
                           if (stats_summary[obs_type] === undefined)
                               stats_summary[obs_type] = {};
                           // Initialize the aggregation type
                           stats_summary[obs_type][agg_lc] = {"value": null};
                           // These aggregation types have a timestamp associated with them.
                           if (['min', 'max', 'last', 'first'].includes(agg_lc)) {
                               stats_summary[obs_type][agg_lc].timestamp = null;
                           }


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
                               if (agg_lc !== agg_name) {
                                   // Internal logic error...
                                   throw new Error(`Requested aggregation type ${agg_lc} ` +
                                                   `does not match received type ${agg_name}`);
                               }
                               // OK, we've found the aggregation value and time. Set the final result
                               // accordingly
                               stats_summary[obs_type][agg_lc].value = agg_value;
                               if (['min', 'max', 'last', 'first'].includes(agg_lc)) {
                                   stats_summary[obs_type][agg_lc].timestamp = time;
                               }
                           }
                       }
                       return Promise.resolve(stats_summary);
                   })
                   .then(stats_summary => {
                       // Goal here is to add wind direction to the max gust. It would be nice
                       // to specify the following in a config file somewhere rather than hard coding it
                       // into the more general MeasurementManager, but I haven't thought of a way of doing that. Yet.
                       if (stats_summary.wind_speed != null) {
                           // Get the time of the max wind speed
                           const maxtime = stats_summary.wind_speed.max.timestamp;
                           // Find the packet with that time stamp
                           return this.find_packet(measurement, maxtime, {platform, stream})
                                      .then(packets => {
                                          if (packets) {
                                              // If there was a result, extract the direction and put i
                                              // in the stats summary
                                              stats_summary.wind_speed.max.dir = packets[0].fields.wind_dir;
                                          }
                                          return Promise.resolve(stats_summary);
                                      });
                       }
                       return Promise.resolve(stats_summary);
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

    // Given a measurement configuration and measurement name, form
    // the "from" part of an InfluxDB query
    get_query_from(measurement) {
        let rp = '';
        let db = '';
        if (this.measurement_config[measurement]) {
            if ('rp' in this.measurement_config[measurement]) {
                rp = `"${this.measurement_config[measurement].rp}".`;
            }
            if ('database' in this.measurement_config[measurement]) {
                db = `"${this.measurement_config[measurement].database}".`;
                if (!rp) rp = '.';
            }
        }
        const from_clause = db + rp + measurement;
        return from_clause;
    };


}

module.exports = MeasurementManager;
