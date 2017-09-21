/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

const cq_policies = require('../config/cq_policies');

function run_all_cqs(influx, sub_sampling_configs) {

    // This is not quite ride. It needs to wait until all measurements have all their cqs run.

    for (let measurement in sub_sampling_configs){
        let strategy_array = sub_sampling_configs[measurement];
        // This will return an array of Promises.
        let promise_array = strategy_array.map(function(sub_sampling_config){
            return run_cq(influx, measurement, sub_sampling_config, cq_policies);
        })
        return Promise.all(promise_array)
            .then(function(results){
                console.log("results=", results)
            })
            .catch(err=>{
                console.log("Unable to set up continuous queries", err)
            })
    }

}

// Returns a promise to set up a continuous query for a measurement, using a
// sub-sampling configuration.
function run_cq(influx, measurement, sub_sampling_config, cq_policies) {

    // Get the database name out of the connection object
    const database = influx.options.database;
    // Get the needed query
    const influx_sql = _form_cq_stmt(database, measurement, sub_sampling_config, cq_policies);
    // Now get and return a promise to run it
    return influx.query(influx_sql);
}


// Form a continuous query statement from the subsampling dictionary
function _form_cq_stmt(database, measurement, sub_sampling_config, cq_policies) {
    // From the collection of cq policies, select the one specified
    // in the sub_sampling_config object
    let cq_policy = cq_policies[sub_sampling_config.cq_policy];
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
        `CREATE CONTINUOUS QUERY "archive_${cq_policy.interval}" ON ${database} ` +
        `BEGIN SELECT ${agg_array} INTO ${sub_sampling_config.destination} ` +
        `FROM ${measurement} GROUP BY time(${cq_policy.interval}) END`;

    return influx_sql;

}

//
// const config = require('../config/config');
// const ss = require('../meta_data/sub_sampling');
// const Influx = require('influx');
// const influx = new Influx.InfluxDB(config.influxdb);
//
// run_all_cqs(influx, ss)