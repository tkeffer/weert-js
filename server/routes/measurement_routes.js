/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Measurement-related routes
 *
 */

'use strict';

const debug = require('debug')('weert:server');
const express = require('express');

const auxtools = require('../auxtools');

const MeasurementRouterFactory = function (measurement_manager, pub_sub) {

    const router = express.Router();

    // GET all packets which satisfies a search query.
    router.get('/measurements/:measurement/packets', function (req, res) {
        const measurement = req.params.measurement;
        const start_time = req.query.start;
        const stop_time = req.query.stop;
        // Make sure start and stop times are numbers:

        measurement_manager
            .find_packets(measurement, req.query.platform, req.query.stream,
                start_time, stop_time, req.query.limit, req.query.direction)
            .then((result) => {
                let deep_result = [];
                for (let i in result) {
                    deep_result[i] = auxtools.flat_to_deep(result[i]);
                }
                res.status(200)
                   .json(deep_result);
            })
            .catch(err => {
                debug('GET /measurements/:measurement/packets/ error:', err);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });

    });

    // POST a single packet to a measurement
    router.post('/measurements/:measurement/packets', function (req, res) {
        // Make sure the incoming packet is encoded in JSON.
        if (req.is('json')) {
            // Get the measurement
            const measurement = req.params.measurement;
            // Get the packet out of the request body:
            const packet = req.body;
            // Insert the packet into the database
            measurement_manager
                .insert_packet(measurement, packet)
                .then(function () {
                    // Form the URL of the newly created resource and send it back in the 'Location' header
                    const resource_url = auxtools.resourcePath(req, packet.timestamp);
                    res.location(resource_url)
                       .sendStatus(201);
                    pub_sub.publish(`/${measurement}`, packet)
                           .then(result=>{})
                           .catch(err => {
                               debug("PUB-SUB error:", err)
                           });
                })
                .catch(function (err) {
                    debug('POST /measurements/:measurement/packets error:', err);
                    res.status(400)
                       .json(auxtools.fromError(400, err));
                });
        } else {
            res.status(415)
               .json({code: 415, message: 'Invalid Content-type', description: req.get('Content-Type')});
        }
    });

    // GET a packet with a specific timestamp
    router.get('/measurements/:measurement/packets/:timestamp', function (req, res) {
        // Get the measurement and timestamp out of the route path
        const measurement = req.params.measurement;
        const timestamp = req.params.timestamp;
        measurement_manager
            .find_packet(measurement, timestamp, req.query.platform, req.query.stream)
            .then(function (packet) {
                if (packet === undefined)
                    res.sendStatus(404);
                else {
                    // Convert to a deep packet
                    let deep_packet = auxtools.flat_to_deep(packet);
                    res.status(200)
                       .json(deep_packet);
                }
            })
            .catch(function (err) {
                debug('GET /measurements/:measurement/packets/:timestamp find error', err);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });
    });

    // DELETE a specific packet
    router.delete('/measurements/:measurement/packets/:timestamp', function (req, res) {
        // Get the measurement and timestamp out of the route path
        const measurement = req.params.measurement;
        const timestamp = req.params.timestamp;
        measurement_manager
            .delete_packet(measurement, timestamp, req.query.platform, req.query.stream)
            .then(() => {
                // No way to tell success or failure with Influx. Just assume Success.
                res.sendStatus(204);
            })
            .catch(function (err) {
                debug('DELETE /measurements/:measurement/packets/:timestamp delete error:', err);
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
            .then(function (measurement_metadata) {
                if (measurement_metadata[0]) {
                    res.json(measurement_metadata);
                } else {
                    res.sendStatus(404);    // Status 404 Resource Not Found
                }
            })
            .catch(function (err) {
                debug('GET /measurements/:measurement error:', err);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });
    });

    // DELETE a measurement
    router.delete('/measurements/:measurement', function (req, res) {
        const measurement = req.params.measurement;
        measurement_manager
            .delete_measurement(measurement)
            .then(function () {
                // No way to tell success or failure with Influx. Just assume Success.
                res.sendStatus(204);
            })
            .catch(function (err) {
                debug('DELETE /measurements/:measurement error:', err);
                console.log('err=', err);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });
    });

    return router;

};

module.exports = MeasurementRouterFactory;
