/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Statistics-related routes
 *
 */

'use strict';

import debugFactory from 'debug';
const debug = debugFactory('weert:routes');
import express from 'express';
import auxtools from '../auxtools.js';
import stats_policies from '../config/stats_policies.js';

const StatsRouterFactory = function (measurement_manager) {

    const router = express.Router();

    router.get('/measurements/:measurement/stats', function (req, res) {

        const {measurement}                 = req.params;
        const {platform, stream, now, span} = req.query;

        if (!span) {
            debug(`GET /measurements/${measurement}/stats:`, "No time span specified");
            res.status(400)
               .send("No time span specified");
        }

        measurement_manager.run_stats(measurement, stats_policies, {
                               platform,
                               stream,
                               now,
                               span
                           })
                           .then(results => res.json(results))
                           .catch(err => {
                               debug(`GET /measurements/${measurement}/stats error:`, err.message);
                               res.status(400)
                                  .json(auxtools.fromError(400, err));
                           });
    });

    return router;
};

export default StatsRouterFactory;