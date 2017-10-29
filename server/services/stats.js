/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

const moment = require('moment');

const config = require('../config/config');

/*
 * Class to manage the InfluxDB database
 */

/** Run the stats specs against the Influx database. Return a stats object.
 * @param {InfluxDB} influx An instance of {@link https://node-influx.github.io/class/src/index.js~InfluxDB.html InfluxDB}.
 * @param {object[]} stats_specs An array of stats_specs. Each stats_spec is an object
 * with keys <tt>obs_type</tt> and <tt>stats</tt>.
 * @param {string} stats_specs[].obs_type The observation type (e.g., <tt>outside_temperature</tt>).
 * @param {string[]} stats_specs[].stats An array of aggregation types to run (e.g., <tt>['min', 'max']</tt>).
 * @param {object} options A hash of options:
 * @param {string} options.measurement The name of the measurement to run against
 * @param {string} options.platform Constrain the stats to <tt>platform</tt>.
 * @param {string} options.stream Constrain the stats to <tt>stream</tt>.
 * @param {number} options.now The stats are done for a specific span, such as a day. This variable is a time
 * in milliseconds somewhere in that span.
 * @param {string} options.span The span of time over which the stats are to be run. Possible choices are <tt>day</tt>,
 * <tt>week</tt>, <tt>month</tt>, or <tt>year</tt>.
 * @param {number} options.timeshift The amount of time any returned timestamps are to be shifted in nanoseconds. This is
 * to compensate for a quirk in continuous queries where they are timestamped with the <i>beginning</i> of their
 * subsampling interval, rather than the more normal end.
 * @returns {*|Promise.<TResult>} A promise to resolve the results to a stats object. Example:<pre><code>
 { altimeter_pressure: 
   { min: { value: 30.12302319926164, timestamp: 1508938800000000000 },
     max: { value: 30.24073112259399, timestamp: 1509038400000000000 } },
  console_voltage:
   { last: { value: 4.680000000000003, timestamp: 1509060900000000000 } },
  dewpoint_temperature: 
   { min: { value: 34.40705910634834, timestamp: 1508938500000000000 },
     max: { value: 50.51108752298587, timestamp: 1509040200000000000 } },
  rain_rain:
   { sum: { value: 0.05 } },
}
</code></pre>
 */
function run_stats(influx, stats_specs, {
    measurement = undefined,
    platform = undefined, stream = undefined,
    now = undefined, span = 'day', timeshift = 0
}) {
    if (now === undefined)
        now = moment();
    let start    = now.startOf(span) * 1000000;
    let stop     = now.endOf(span) * 1000000;
    let queries  = [];
    let ordering = [];

    for (let stats_spec of stats_specs) {
        let obs_type = stats_spec.obs_type;
        let stats    = stats_spec.stats;
        if (stats) {
            for (let agg of stats) {
                // TODO: The time boundaries work for the results of a CQ, but not other sources
                let query_string = `SELECT ${agg}(${obs_type}) FROM ${measurement} WHERE time>=${start} AND time<${stop}`;

                if (platform)
                    query_string += ` AND platform = '${platform}'`;
                if (stream)
                    query_string += ` AND stream = '${stream}'`;
                queries.push(query_string);
                ordering.push([obs_type, agg]);
            }
        }
    }

    return influx.query(queries)
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

module.exports = {
    run_stats: run_stats
};

// const Influx = require('influx');
// const influx = new Influx.InfluxDB(config.influxdb);
// const obs_types = require('../config/obs_types');
// run_stats(influx, obs_types, {span: 'month', measurement: 'wxrecords', platform: "default_platform"})
//     .then(results => {
//         console.log(results);
//     });
//
