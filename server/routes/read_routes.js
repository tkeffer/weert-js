/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Non-mutable measurement-related routes
 *
 */

'use strict';

const debug   = require('debug')('weert:routes');
const express = require('express');

const auxtools = require('../auxtools');

const ReadRouterFactory = function (measurement_manager) {

    const router = express.Router();

    // GET all packets which satisfies a search query.
    router.get('/measurements/:measurement/packets', function (req, res) {
        const measurement = req.params.measurement;

        measurement_manager
            .find_packets(measurement, {
                platform  : req.query.platform,
                stream    : req.query.stream,
                start_time: req.query.start,
                stop_time : req.query.stop,
                limit     : req.query.limit,
                direction : req.query.direction
            })
            .then(packet => {
                res.status(200)
                   .json(packet);
            })
            .catch(err => {
                debug('GET /measurements/:measurement/packets/ error:', err);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });

    });


    // GET a packet with a specific timestamp
    router.get('/measurements/:measurement/packets/:timestamp', function (req, res) {
        // Get the measurement and timestamp out of the route path
        const measurement = req.params.measurement;
        const timestamp   = req.params.timestamp;
        measurement_manager
            .find_packet(measurement, timestamp, {
                platform: req.query.platform,
                stream  : req.query.stream
            })
            .then((packet) => {
                if (packet === undefined)
                    res.sendStatus(404);
                else {
                    res.status(200)
                       .json(packet);
                }
            })
            .catch(err => {
                debug('GET /measurements/:measurement/packets/:timestamp find error', err);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });
    });

    // GET metadata about a single measurement
    router.get('/measurements/:measurement', function (req, res) {
        // Get the measurement out of the route path
        const measurement = req.params.measurement;

        measurement_manager
            .get_measurement_info(measurement)
            .then(measurement_metadata => {
                if (measurement_metadata[0]) {
                    res.json(measurement_metadata);
                } else {
                    res.sendStatus(404);    // Status 404 Resource Not Found
                }
            })
            .catch(err => {
                debug('GET /measurements/:measurement error:', err);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });
    });

    return router;

};

module.exports = ReadRouterFactory;
