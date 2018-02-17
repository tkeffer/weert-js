/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Set of default continuous query policies.
 * Right now, there is only one, Standard5, but others,
 * such as daily, could be added.
 */

var obs_types = require('./obs_types');

// Extract the aggregation type from the observation type metadata.
var aggregations = obs_types.reduce(
    (accum, current) => {
        accum[current.obs_type] = current.subsample;
        return accum;
    }, {});

module.exports = {
    "Standard5": {
        "interval"   : "5m",
        "aggregation": aggregations,
    }
};
