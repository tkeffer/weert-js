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

const debug   = require('debug')('weert:routes');
const express = require('express');

const auxtools  = require('../auxtools');
const obs_types = require('../config/obs_types');

const StatsRouterFactory = function (measurement_manager) {

    const router = express.Router();

    router.get('/measurements/:measurement/stats', function (req, res) {

        if (!req.query.span) {
            debug('GET /measurements/:measurement/stats:', "No time span specified");
            res.status(400)
               .send("No time span specified");
        }

        measurement_manager.run_stats(req.params.measurement, obs_types, {
                 platform   : req.query.platform,
                 stream     : req.query.stream,
                 now        : req.query.now,
                 span       : req.query.span
             })
             .then(results => {
                 res.json(results);
             })
             .catch(err => {
                 debug('GET /measurements/:measurement/stats error:', err.message);
                 res.status(400)
                    .json(auxtools.fromError(400, err));
             });
    });

    return router;
};

module.exports = StatsRouterFactory;