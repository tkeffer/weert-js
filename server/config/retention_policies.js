/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Set of default retention policies.
 * Right now, there is only one, 'h24', but others could be added.
 */

export default {
    "h24": {
        database   : 'weert',
        duration   : '24h',
        replication: 1,
    }
};
