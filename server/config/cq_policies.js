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

module.exports = {
    "Standard5": {
        "interval"   : "5m",
        // This allows one to specify a generalized aggregation policy, but we
        //  will just use the subsampling specified in obs_types.
        "aggregation": obs_types,
    }
};
