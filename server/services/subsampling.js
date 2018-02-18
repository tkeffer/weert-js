/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

const debug = require('debug')('weert:subsampling');

const cq_policies = require('../config/cq_policies');
const config      = require('../config/config');
const auxtools    = require('../auxtools');

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
 * @param {string} agg_obj_array[].subsample - The aggregation (e.g., 'avg' or 'sum') to be used for this type
 * @param {boolean} as - True to include 'as' clause. Otherwise, false.
 * @returns {string} - The aggregation clause. It will look something like "AVG(out_temperature),SUM(rain_rain)..."
 */
function form_agg_clause(agg_obj_array, as=false) {
    let aggs = [];
    for (let agg_obj of agg_obj_array) {
        let agg_type = agg_obj.subsample.toLowerCase();
        // Offer 'avg' as a synonym for 'mean':
        if (agg_type === 'avg')
            agg_type = 'mean';
        let agg_str = `${agg_type}(${agg_obj.obs_type})`;
        if (as) agg_str += ` as ${agg_obj.obs_type}`;
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
    create_all_cqs   : create_all_cqs,
    setup_all_notices: setup_all_notices,
    form_agg_clause  : form_agg_clause
};
