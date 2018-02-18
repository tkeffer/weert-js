/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Set of default retention policies.
 * Right now, there is only one, 'h24', but others could be added.
 */

module.exports = {
    "h24": {
        database   : 'weert',
        duration   : '24h',
        replication: 1,
    }
};
