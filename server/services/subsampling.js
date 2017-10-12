/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

const debug = require('debug')('weert:subsampling');

const cq_policies = require('../config/cq_policies');
const config = require('../config/config');
const auxtools = require('../auxtools');

function create_all_cqs(influx, measurement_configs) {

    let all_promises = [];

    // Iterate over all measurements
    for (let measurement in measurement_configs) {
        let measurement_config = measurement_configs[measurement];
        // Then over all the Continuous Query configurations for that measurement
        for (let cq_config of measurement_config.cqs) {
            // For each CQ configuration, create and run the query
            all_promises.push(_create_cq(influx,
                                         measurement_config,
                                         measurement,
                                         cq_config));
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

// Form a continuous query statement from the subsampling dictionary
function _form_cq_stmt(measurement_config, measurement, cq_config) {
    // From the collection of cq policies, select the one specified
    // in the cq_config object
    let cq_policy = cq_policies[cq_config.cq_policy];
    let database = measurement_config.database;

    let aggs = [];
    for (let k in cq_policy.aggregation) {
        let agg = cq_policy.aggregation[k].toLowerCase();
        // Offer 'avg' as a synonym for 'mean':
        if (agg === 'avg')
            agg = 'mean';
        aggs.push(`${agg}(${k}) as ${k}`);
    }

    let agg_array = aggs.join(', ');
    let from_clause = auxtools.get_query_from(measurement, measurement_config);

    let influx_sql =
        `CREATE CONTINUOUS QUERY ${cq_config.cq_name} ON ${database} ` +
        `BEGIN SELECT ${agg_array} INTO ${cq_config.cq_destination} ` +
        `FROM ${from_clause} GROUP BY time(${cq_policy.interval}), * END`;

    return influx_sql;
}

// Call a callback every ms, on an even boundary plus a delay
function notice(ms, callback) {
    let now = Date.now();
    let next_notice = (Math.floor(now / ms) + 1) * ms + config.influxdb.cq_delay;
    let diff = next_notice - now;
    // Set a timer to set up the regular notices
    setTimeout(function () {
        // The first notice has arrived. Call the callback, then set a timer
        // to keep calling the callback every ms milliseconds
        callback();
        setInterval(callback, ms);
    }, diff);
}

function setup_all_notices(influx, pub_sub, measurement_configs) {
    // Iterate over all measurement names in the config file
    for (let measurement in measurement_configs) {

        let measurement_config = measurement_configs[measurement];

        for (let cq_config of measurement_config.cqs) {
            let cq_policy = cq_policies[cq_config.cq_policy];
            let interval_ms = auxtools.epoch_to_ms(cq_policy.interval);
            let cq_destination = cq_config.cq_destination;
            let query_string = `SELECT * FROM ${cq_destination} ORDER BY time desc LIMIT 1`;

            debug(`Set up notice for CQ destination ${cq_destination} every ${interval_ms}ms`);

            // Arrange to publish every ms milliseconds
            notice(interval_ms, function () {
                console.log("CQ notice timer is up. Time is", Date.now());
                influx.query(query_string)
                      .then(result => {
                          if (result.length) {
                              let packet = auxtools.flat_to_deep(result[0]);
                              debug(`Publishing packet from ${cq_destination} with timestamp ${packet.timestamp}`);
                              return pub_sub.publish(`/${cq_destination}`, packet);
                          }
                          return new Promise.resolve();
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

module.exports = {
    create_all_cqs   : create_all_cqs,
    setup_all_notices: setup_all_notices
};
