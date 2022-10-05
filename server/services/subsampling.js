/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

"use strict";

import _ from "lodash";
import debugFactory from "debug";

const debug = debugFactory("weert:subsampling");
import async from "async";
import cron from "cron";
import auxtools from "../auxtools.js";
import config from "../config/config.js";
import ss_specs from "../config/ss_policies.js";
import event_emitter from "./event_emitter.js";

function setup_cron (measurement_manager) {

  let jobs = [];
  for (let ss_spec of ss_specs) {
    if ((ss_spec.interval % 60000) !== 0) {
      throw new Error("Subsampling interval must be multiple of 60000ms");
    }
    const skip        = ss_spec.interval / 60000;
    const cronOptions = {
      cronTime: `5 */${skip} * * * *`,    // 5 seconds after the minute
      onTick: () => {
        debug(`Starting subsampling at ${new Date()}.`);
        subsample(measurement_manager, ss_spec)
          .then(nArray => {
            const nTotal = nArray.reduce((s, N) => s + N, 0);
            debug(`Finished subsampling at ${new Date()}. ${nTotal} record(s) created.`);
          });
      },
      start: true
    };
    let job           = new cron.CronJob(cronOptions);
    jobs.push(job);
    debug(`Created cron job`);
  }
  return jobs;
}

/**
 * Subsample a measurement using a subsampling strategy. The created records are inserted into
 * the database. It also emits a NEW_AGGREGATE event for each produced record. These events
 * are not emitted in any particular order.
 * @param {MeasurementManager} measurement_manager - Instance of a MeasurementManager
 * @param {object} ss_spec - An object containing the subsampling options to use.
 * @param {string} ss_spec.source - The source measurement
 * @param {string} ss_spec.destination - The destination measurement
 * @param {number} ss_spec.interval - How often to subsample in milliseconds
 * @param {object} ss_spec.aggregates - An object holding the subsampling strategy to be
 * used for each type.
 * @param {number|undefined} ss_spec.end_ts - Generate subsamples up through this time. If not given,
 *                                            the present time will be used. The final number is ceiled
 *                                            with the interval.
 * @returns {Promise<number>[]} - An array of promises, one for each series. They will resolve to the number
 * of new records created for each series.
 */
function subsample (measurement_manager, ss_spec) {

  const { source } = ss_spec;

  // Find all the tags in the source measurement and process them separately
  return measurement_manager.get_measurement_info(source)
                            .then(all_tags => {
                              let pAll = [];
                              // Then for each tag, subsample it.
                              for (let tag of all_tags) {
                                // Push the new promise on to the array of promises
                                pAll.push(subsample_series(measurement_manager, ss_spec, tag));
                              }
                              // Now return a promise to resolve them all
                              return Promise.all(pAll);
                            });

}

/**
 * Subsample a specific series within a measurement
 * @param {MeasurementManager} measurement_manager - Instance of a MeasurementManager
 * @param {object} ss_spec - An object containing the subsampling options to use
 * @param {string} ss_spec.source - The source measurement
 * @param {string} ss_spec.destination - The destination measurement
 * @param {number} ss_spec.interval - How often to subsample in milliseconds
 * @param {object} ss_spec.aggregates - An object holding the subsampling strategy to be
 * used for each type.
 * @param {number|undefined} ss_spec.end_ts - Generate subsamples up through this time. If not given,
 *                                            the present time will be used. The final number is ceiled
 *                                            with the interval.
 * @returns {Promise<number>} - Returns a promise to resolve to the number of records created and inserted.
 */
function subsample_series (measurement_manager, ss_spec, tag) {

  const { source, destination, interval, aggregates } = ss_spec;

  const end_ts = auxtools.ceil(ss_spec.end_ts || Date.now(), interval);

  return new Promise(function(resolve, reject) {

    // Get the necessary start, stop times. Wait for them to all resolve before proceeding.
    Promise.all([
                  measurement_manager.get_last_timestamp(source, tag),
                  measurement_manager.get_first_timestamp(source, tag),
                  measurement_manager.get_last_timestamp(destination, tag)
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
               // We are going to aggregate all the packets of 'source' in the interval (start, stop], then
               // insert it into 'destination.'
               const { start, stop } = interval;
               const options         = {
                 ...tag,
                 start_time: start,
                 stop_time: stop,
                 aggregates
               };

               measurement_manager.find_packets(source, options)
                                  .then(agg_packets => {
                                    if (agg_packets.length) {
                                      if (agg_packets > 1) {
                                        throw new Error(
                                          `Internal error in subsample_series (${agg_packets.length})`);
                                      }
                                      // Extract the single, aggregated record
                                      const record = {
                                        ...agg_packets[0],
                                        tags: tag
                                      };

                                      const final_record = calc_derived(record, aggregates);

                                      // Return a promise to insert the aggregated packet.
                                      // The promise will resolve to the final, inserted packet
                                      return measurement_manager.insert_packet(destination, final_record);
                                    } else {
                                      // No aggregated packet. Just return a promise to resolve
                                      // to an empty record.
                                      return Promise.resolve({});
                                    }
                                  })
                                  .then(record => {
                                    // If the record has a timestamp, it's not empty.
                                    if (record.timestamp) {
                                      event_emitter.emit("NEW_AGGREGATE", record, destination);
                                      debug(`Emitted record with timestamp ${new Date(record.timestamp)}`);
                                      N += 1;
                                    }
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
                            stop: start_ts + interval
                          });
               start_ts += interval;
             }

             // Wait until all the workers are done, then call the resolve function with
             // the number of new records.
             queue.drain(() => resolve(N));
           });
  });
}

/**
 * Form the set of aggregated observation types to be used in an InfluxDB SELECT statement.
 * @param {object} aggregates - An object holding the aggregation strategy for each type. The
 * key is the type, the value an IQL expression (such as, "MEAN(out_temperature)").
 * @returns {string} - The aggregation clause. It will look something like "avg(out_temperature),sum(rain_rain)..."
 */
function form_agg_clause (aggregates) {
  const aggs = [];
  let agg_str;
  for (let out_type of Object.keys(aggregates)) {
    agg_str = aggregates[out_type];
    if (_.isString(agg_str)) {
      agg_str += ` AS ${out_type}`;
      aggs.push(agg_str);
    }
  }

  return aggs.join(", ");
}

function calc_derived (deep_record, aggregates) {
  // Return a copy, adding new, calculated types to the fields.
  return {
    ...deep_record,
    fields: {
      ...deep_record.fields,
      ...Object.keys(aggregates)
               .filter(obsType => _.isFunction(aggregates[obsType]))
               .reduce((derived, obsType) => {
                 derived[obsType] = aggregates[obsType](deep_record.fields);
                 return derived;
               }, {})
    }
  };
}

export default {
  setup_cron,
  subsample,
  form_agg_clause
};
