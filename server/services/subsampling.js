/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

'use strict';

const debug = require('debug')('weert:subsampling');
const async = require('async');

const config   = require('../config/config');
const auxtools = require('../auxtools');

/**
 * Subsample a measurement using a subsampling strategy
 * @param {MeasurementManager} measurement_manager - Instance of a MeasurementManager
 * @param {object} options - An object containing the subsampling options to use
 * @param {string} options.source - The source measurement
 * @param {string} options.destination - The destination measurement
 * @param {number} options.interval - How often to subsample in milliseconds
 * @param {object[]} options.strategy - An array of subsampling strategies to use
 * @param {number|undefined} options.end_ts - Generate subsamples up through this time. If not given,
 *                                            the present time will be used. The final number is ceiled
 *                                            with the interval.
 */
function subsample(measurement_manager, options) {

    const {source} = options;

    // Find all the tags in the source measurement and process them separately
    return measurement_manager.get_measurement_info(source)
                              .then(all_tags => {
                                  let pAll = [];
                                  // Then for each tag, subsample it.
                                  for (let tag of all_tags) {
                                      // Push the new promise on to the array of promises
                                      pAll.push(subsample_series(measurement_manager, options, tag));
                                  }
                                  // Now return a promise to resolve them all
                                  return Promise.all(pAll);
                              });

}


function subsample_series(measurement_manager, options, tag) {

    const {source, destination, interval, strategy} = options;

    const end_ts = auxtools.ceil(options.end_ts || Date.now(), interval);

    const agg_clause = form_agg_clause(strategy, true);

    return new Promise(function (resolve, reject) {

        // Get the necessary start, stop times. Wait for them to all resolve before proceeding.
        Promise.all([
                        measurement_manager.get_last_timestamp(source, tag),
                        measurement_manager.get_first_timestamp(source, tag),
                        measurement_manager.get_last_timestamp(destination, tag),
                    ])
               .then(tss => {
                   let [source_last_ts, source_first_ts, destination_last_ts] = tss;

                   // We start up with the last record. If this is the first time through, then
                   // there will be no last record, so we start just before the first packet.
                   let start_ts = destination_last_ts || auxtools.floor(source_first_ts, interval);
                   let last_ts  = end_ts;
                   // If the ending time end_ts is way beyond the last packet, then there is no need
                   // to go that far. Stop with the interval containing the last packet.
                   if (source_last_ts != null) {
                       last_ts = Math.min(last_ts, auxtools.floor(source_last_ts, interval));
                   }

                   let N = 0;
                   // Do all the aggregations and insertions asynchronously.
                   // Get a queue function from async.queue that does what we need.
                   let queue = async.queue((interval, done) => {
                       const {start, stop} = interval;
                       const options       = {
                           ...tag,
                           start_time: start,
                           stop_time : stop,
                           aggregates: strategy,
                       };

                       measurement_manager.find_packets(source, options)
                                          .then(agg_packets => {
                                              if (agg_packets.length) {
                                                  const agg_packet = {
                                                      ...agg_packets[0],
                                                      tags: tag,
                                                  };
                                                  // Return a promise to insert the aggregated packet.
                                                  // The promise will resolve to the final, inserted packet
                                                  return measurement_manager.insert_packet(destination, agg_packet);
                                              } else {
                                                  // No aggregated packet. Just return a promise to resolve
                                                  // to an empty packet.
                                                  return Promise.resolve({});
                                              }
                                          })
                                          .then(packet => {
                                              // If packet has a timestamp, it's not empty.
                                              if (packet.timestamp) {N += 1;}
                                              done();
                                          })
                                          .catch(error => {
                                              reject(error);
                                          });
                   }, config.concurrency);

                   // Now populate the queue
                   while (start_ts < last_ts) {
                       queue.push({
                                      start: start_ts,
                                      stop : start_ts + interval,
                                  });
                       start_ts += interval;
                   }

                   // Wait until all the workers are done, then call the resolve function with
                   // the number of records created.
                   queue.drain = () => {
                       resolve(N);
                   };
               });
    });
}


// Create all the Continuous Queries specified
// in the measurement configuration. Returns an array
// of promises, one for each CQ to be set up.
function create_all_cqs(influx, measurement_configs) {

    let all_promises = [];

    // Iterate over all measurements
    for (let measurement in measurement_configs) {
        let measurement_config = measurement_configs[measurement];
        // Check to see if any CQs have been specified.
        if (measurement_config.cqs) {
            // Iterate over all the Continuous Query configurations for this measurement
            for (let cq_config of measurement_config.cqs) {
                // For each CQ configuration, promise to create the query.
                all_promises.push(_create_cq(influx,
                                             measurement_config,
                                             measurement,
                                             cq_config));
            }
        }
    }

    // Return a promise to settle the array of promises:
    return Promise.all(all_promises);
}

// Returns a promise to set up a continuous query for a measurement.
function _create_cq(influx, measurement_config, measurement, cq_config) {

    // Get the needed query
    const influx_sql = _form_cq_stmt(measurement_config, measurement, cq_config);
    // Now get and return a promise to run it
    return influx.query(influx_sql);
}

// Form a continuous query statement suitable for the specific
// CQ specified in cq_config
function _form_cq_stmt(measurement_config, measurement, cq_config) {

    let database = measurement_config.database;

    // From the collection of cq policies, select the one specified
    // in the cq_config object
    let cq_policy = cq_policies[cq_config.cq_policy];
    // Using the aggregation strategy specified in that policy, form an aggregation clause.
    // This will be something like "mean(out_temperature) as out_temperature, sum(rain_rain) as rain_rain ..."
    let agg_clause  = form_agg_clause(cq_policy.aggregation, true);
    // Then get the fully qualified measurement name
    let from_clause = auxtools.get_query_from(measurement, measurement_config);

    // Put it all together:
    let influx_sql =
            `CREATE CONTINUOUS QUERY ${cq_config.cq_name} ON ${database} ` +
            `BEGIN SELECT ${agg_clause} INTO ${cq_config.cq_destination} ` +
            `FROM ${from_clause} GROUP BY time(${cq_policy.interval}), * END`;

    return influx_sql;
}

/**
 * Form the set of aggregated observation types to be used in an InfluxDB SELECT statement.
 * @param {object[]} agg_obj_array - An array of objects, each of which specify the type of aggregation to be done
 * for a specific observation type.
 * @param {string} agg_obj_array[].obs_type - The observation type (e.g., 'out_temperature')
 * @param {string} agg_obj_array[].subsample - An InfluxDB expression to be used for this type.
 *                                             Something like 'mean(out_temperature')
 * @param {boolean} as - True to include 'as' clause. Otherwise, false.
 * @returns {string} - The aggregation clause. It will look something like "avg(out_temperature),sum(rain_rain)..."
 */
function form_agg_clause(agg_obj_array, as = false) {
    let aggs = [];
    for (let agg_obj of agg_obj_array) {
        let agg_str = agg_obj.subsample;
        if (as) agg_str += ` AS ${agg_obj.obs_type}`;
        aggs.push(agg_str);
    }

    let agg_clause = aggs.join(', ');
    return agg_clause;
}

// Call a callback every ms, on an even boundary plus a delay
function notice(ms, callback) {
    let now         = Date.now();
    let next_notice = (Math.floor(now / ms) + 1) * ms + config.influxdb.cq_delay;
    let diff        = next_notice - now;
    // Set a timer to set up the regular notices
    setTimeout(function () {
        // The first notice has arrived. Call the callback, then set a timer
        // to keep calling the callback every ms milliseconds
        callback();
        setInterval(callback, ms);
    }, diff);
}

function setup_all_notices(measurement_manager, pub_sub, measurement_configs) {
    // TODO: This strategy fails if the server is suspended (as on a laptop) for some reason.
    // Iterate over all measurement names in the config file
    for (let measurement in measurement_configs) {

        let measurement_config = measurement_configs[measurement];

        if (measurement_config.cqs) {
            for (let cq_config of measurement_config.cqs) {
                let cq_policy      = cq_policies[cq_config.cq_policy];
                let interval_ms    = auxtools.epoch_to_ms(cq_policy.interval);
                let cq_destination = cq_config.cq_destination;

                debug(`Set up notice for CQ destination ${cq_destination} every ${interval_ms}ms`);

                // Arrange to publish every interval_ms milliseconds
                notice(interval_ms, function () {
                    // Find the latest record in the CQ destination0
                    measurement_manager.find_packets(cq_destination, {limit: 1, direction: 'desc'})
                                       .then(result => {
                                           if (result.length) {
                                               let packet = result[0];
                                               let d      = new Date(packet.timestamp);
                                               debug(`Publishing packet from ${cq_destination} for ` +
                                                     `time ${d} (${packet.timestamp})`);
                                               return pub_sub.publish(`/${cq_destination}`, packet);
                                           }
                                           return Promise.resolve();
                                       })
                                       .then(result => {
                                       })
                                       .catch(err => {
                                           debug(`Error updating CQ destination ${cq_destination}: ${err}`);
                                       });
                });
            }
        }
    }
}

module.exports = {
    subsample,
    subsample_series,
    create_all_cqs   : create_all_cqs,
    setup_all_notices: setup_all_notices,
    form_agg_clause  : form_agg_clause,
};
