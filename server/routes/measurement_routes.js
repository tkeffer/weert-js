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

const MeasurementRouterFactory = function (measurement_manager) {

    const router = express.Router();

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
                    // Add a nanosecond timestamp
                    packet['timestamp'] = packet.time.getNanoTime();
                    // Calculate the actual URL of the returned packet
                    // and include it in the Location response header.
                    const replaceUrl = req.originalUrl.replace(req.params.timestamp, packet.timestamp);
                    const resource_url = auxtools.locationPath(replaceUrl, req.protocol, req.get('host'), '');
                    res.status(200)
                        .location(resource_url)
                        .json(packet);
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
                console.log("result from GET all packets=", result);
                res.status(200)
                    .json(result)
            })
            .catch(err=>{
                debug('GET /measurements/:measurement/packets/ error:', err);
                res.status(400)
                    .json(auxtools.fromError(400, err));
            });

    });

    // // GET metadata about a single measurement
    // router.get('/measurements/:measurement', function (req, res) {
    //   // Get the measurement out of the route path
    //   const measurement = req.params.measurement
    //
    //   measurement_manager
    //     .findMeasurement(measurement)
    //     .then(function (measurement_metadata) {
    //       if (measurement_metadata) {
    //         res.json(measurement_metadata)
    //       } else {
    //         res.sendStatus(404)    // Status 404 Resource Not Found
    //       }
    //     })
    //     .catch(function (err) {
    //       debug('GET /measurements/:measurement error:', err)
    //       res.status(400)
    //          .json(auxtools.fromError(400, err))
    //     })
    // })
    //
    // // DELETE a measurement
    // router.delete('/measurements/:measurement', function (req, res) {
    //   // Get the measurement out of the route path
    //   const measurement = req.params.measurement
    //
    //   measurement_manager
    //     .delete_measurement(measurement)
    //     .then(result => {
    //       if (result) {
    //         res.sendStatus(204)
    //       } else {
    //         res.sendStatus(404)    // Status 404 Resource Not Found
    //       }
    //     })
    //     .catch(err => {
    //       debug('DELETE /measurements/:measurement error:', err)
    //       error.sendError(err, res)
    //     })
    // })

    return router;

};

module.exports = MeasurementRouterFactory;
