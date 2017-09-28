/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

const cq_policies = require('../config/cq_policies');

function run_all_cqs(influx, all_ss_configs) {

    let all_promises = [];

    // Iterate over all measurement names in the config file
    for (let measurement in all_ss_configs) {

        // Then over the array of specs for this measurement:
        for (let i in all_ss_configs[measurement]) {
            all_promises.push(run_cq(influx, measurement, all_ss_configs[measurement][i]));
        }
    }

    // Return a promise to settle the array of promises:
    return Promise.all(all_promises);
}

// Returns a promise to set up a continuous query for a measurement, using a
// sub-sampling configuration.
function run_cq(influx, measurement, ss_config) {

    // Get the database name out of the connection object
    const database = influx.options.database;
    // Get the needed query
    const influx_sql = _form_cq_stmt(database, measurement, ss_config, cq_policies);
    // Now get and return a promise to run it
    return influx.query(influx_sql);
}


// Form a continuous query statement from the subsampling dictionary
function _form_cq_stmt(database, measurement, ss_config) {
    // From the collection of cq policies, select the one specified
    // in the ss_config object
    let cq_policy = cq_policies[ss_config.cq_policy];
    let aggs = [];
    for (let k in cq_policy.aggregation) {
        let agg = cq_policy.aggregation[k].toLowerCase();
        // Offer 'avg' as a synonym for 'mean':
        if (agg === 'avg')
            agg = 'mean';
        aggs.push(`${agg}(${k}) as ${k}`);
    }

    let agg_array = aggs.join(', ');

    let influx_sql =
        `CREATE CONTINUOUS QUERY ${ss_config.cq_name} ON ${database} ` +
        `BEGIN SELECT ${agg_array} INTO ${ss_config.destination} ` +
        `FROM ${measurement} GROUP BY time(${cq_policy.interval}), * END`;

    return influx_sql;
}

module.exports = {
    run_all_cqs: run_all_cqs,
    run_cq     : run_cq
};


// const config = require('../config/config');
// const ss = require('../meta_data/sub_sampling');
// const Influx = require('influx');
// const influx = new Influx.InfluxDB(config.influxdb);
//
// run_all_cqs(influx, ss)
//     .then(result => {
//         console.log(result);
//     })
//     .catch(err=> console.log(err));