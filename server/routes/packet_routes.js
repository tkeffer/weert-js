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

const debug   = require('debug')('weert:routes');
const express = require('express');

const auxtools = require('../auxtools');

const PacketRouterFactory = function (measurement_manager, pub_sub) {

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
                .then(() => {
                    // Form the URL of the newly created resource and send it back in the 'Location' header
                    const resource_url = auxtools.resourcePath(req, packet.timestamp);
                    res.location(resource_url)
                       .sendStatus(201);
                    // Notify any subscribers via the pub-sub facility
                    pub_sub.publish(`/${measurement}`, packet)
                           .then(function () {
                                     debug(`PUBlished packet ${new Date(packet.timestamp / 1000000)} to /${measurement}`);
                                 },
                                 function (err) {
                                     debug("POST /measurements/:measurement/packets PUB-SUB error:", err.message);
                                 });
                })
                .catch(function (err) {
                    debug('POST /measurements/:measurement/packets error:', err.message);
                    res.status(400)
                       .json(auxtools.fromError(400, err));
                });
        } else {
            res.status(415)
               .json({code: 415, message: 'Invalid Content-type', description: req.get('Content-Type')});
        }
    });

    // DELETE a specific packet
    router.delete('/measurements/:measurement/packets/:timestamp', function (req, res) {
        // Get the measurement and timestamp out of the route path
        const measurement = req.params.measurement;
        const timestamp = req.params.timestamp;
        measurement_manager
            .delete_packet(measurement, timestamp, {
                platform: req.query.platform,
                stream  : req.query.stream
            })
            .then(() => {
                // No way to tell success or failure with Influx. Just assume Success.
                res.sendStatus(204);
            })
            .catch(err => {
                debug('DELETE /measurements/:measurement/packets/:timestamp delete error:', err.message);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });
    });

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
                debug('GET /measurements/:measurement/packets/ error:', err.message);
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
                debug('GET /measurements/:measurement/packets/:timestamp find error', err.message);
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
                debug('GET /measurements/:measurement error:', err.message);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });
    });

    // DELETE a measurement
    router.delete('/measurements/:measurement', function (req, res) {
        const measurement = req.params.measurement;
        measurement_manager
            .delete_measurement(measurement)
            .then(() => {
                // No way to tell success or failure with Influx. Just assume Success.
                res.sendStatus(204);
            })
            .catch(err => {
                debug('DELETE /measurements/:measurement error:', err.message);
                res.status(400)
                   .json(auxtools.fromError(400, err));
            });
    });

    return router;

};

module.exports = PacketRouterFactory;
