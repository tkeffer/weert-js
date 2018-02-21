/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Set of default subsampling policies.
 * Right now, there is only one, Standard5, but others,
 * such as daily, could be added.
 */

var obs_types = require('./obs_types');

module.exports = [
    {
        interval   : 300000,    // = 5 minutes in milliseconds
        source     : "wxpackets",
        destination: "wxrecords",
        // This allows one to specify a generalized subsampling policy, but we
        //  will just use the subsampling specified in obs_types.
        strategy   : obs_types,
    },
];
