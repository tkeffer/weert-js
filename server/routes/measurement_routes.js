/*
 * Copyright (c) 2015-2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Measurement-related routes
 *
 */

'use strict'

var debug = require('debug')('weert:server')
var express = require('express')

var auxtools = require('../auxtools')

var MeasurementRouterFactory = function (measurement_manager) {

  var router = express.Router()

  // GET metadata about a single measurement
  router.get('/measurements/:measurement', function (req, res) {
    // Get the measurement out of the route path
    var measurement = req.params.measurement

    measurement_manager
      .findMeasurement(measurement)
      .then(function (measurement_metadata) {
        if (measurement_metadata) {
          res.json(measurement_metadata)
        } else {
          res.sendStatus(404)    // Status 404 Resource Not Found
        }
      })
      .catch(function (err) {
        debug('GET /measurements/:measurement error:', err)
        error.sendError(err, res)
      })
  })

  // DELETE a measurement
  router.delete('/measurements/:measurement', function (req, res) {
    // Get the measurement out of the route path
    var measurement = req.params.measurement

    measurement_manager
      .deleteMeasurement(measurement)
      .then(result => {
        if (result) {
          res.sendStatus(204)
        } else {
          res.sendStatus(404)    // Status 404 Resource Not Found
        }
      })
      .catch(err => {
        debug('DELETE /measurements/:measurement error:', err)
        error.sendError(err, res)
      })
  })

  // POST a single packet to a measurement
  router.post('/measurements/:measurement/packets', function (req, res) {
    // Make sure the incoming packet is encoded in JSON.
    if (req.is('json')) {
      // Get the measurement
      var measurement = req.params.measurement
      // Get the packet out of the request body:
      var packet = req.body
      // Insert the packet into the database
      measurement_manager
        .insert_packet(measurement, packet)
        .then(function (result) {
          var resource_url = auxtools.resourcePath(req, packet.time)
          res.status(201)
             .location(resource_url)
             .json(packet)
        })
        .catch(function (err) {
          debug('POST /measurements/:measurement/packets error:', err)
          error.sendError(err, res)
        })
    } else {
      res.status(415)
         .json({code: 415, message: 'Invalid Content-type', description: req.get('Content-Type')})
    }
  })

  // GET all packets which satisfies a search query.
  router.get('/measurements/:measurement/packets', function (req, res) {
    var dbQuery
    try {
      dbQuery = auxtools.formSpanQuery(req.query)
    }
    catch (err) {
      err.description = req.query
      debug('GET /measurements/:measurement/packets error forming query:', err)
      res.status(400)
         .json(auxtools.fromError(400, err))
      return
    }

    // Get the measurement out of the route path
    var measurement = req.params.measurement

    // Accept either 'aggregate_type' or 'agg_type'. Former takes precedence.
    req.query.aggregate_type = req.query.aggregate_type || req.query.agg_type

    // Is an aggregation being requested?
    if (req.query.aggregate_type) {
      // Yes, an aggregation is being requested.
      dbQuery.aggregate_type = req.query.aggregate_type
      var obs_type = req.query.obs_type
      measurement_manager
        .aggregatePackets(measurement, obs_type, dbQuery)
        .then(function (result) {
          res.json(result)
        })
        .catch(function (err) {
          debug('GET /measurements/:measurement/packets aggregation error:', err)
          error.sendError(err, res)
        })
    } else {
      // An aggregation is not being request. Return the matched packets.
      measurement_manager
        .findPackets(measurement, dbQuery)
        .then(function (packet_array) {
          debug('# of packets=', packet_array.length)
          res.json(packet_array)
        })
        .catch(function (err) {
          debug('GET /measurements/:measurement/packets find error:', err)
          error.sendError(err, res)
        })
    }
  })

  // GET a packet with a specific timestamp
  router.get('/measurements/:measurement/packets/:timestamp', function (req, res) {
    // Get the measurement and timestamp out of the route path
    var measurement = req.params.measurement
    var dbQuery
    try {
      if (req.query.match === undefined)
        req.query.match = 'exact'
      dbQuery = auxtools.formTimeQuery(req.params, req.query)
    }
    catch (err) {
      err.description = req.query
      debug('GET /measurements/:measurement/packets/:timestamp error forming query:', err)
      res.status(400)
         .json(auxtools.fromError(400, err))
      return
    }

    measurement_manager
      .findPacket(measurement, dbQuery)
      .then(function (packet) {
        if (packet === null)
          res.sendStatus(404)
        else {
          // Calculate the actual URL of the returned packet
          // and include it in the Location response header.
          var replaceUrl = req.originalUrl.replace(req.params.timestamp, packet.timestamp)
          var resource_url = auxtools.locationPath(replaceUrl, req.protocol, req.get('host'), '')
          res.status(200)
             .location(resource_url)
             .json(packet)
        }
      })
      .catch(function (err) {
        debug('GET /measurements/:measurement/packets/:timestamp find error', err)
        error.sendError(err, res)
      })
  })

  // DELETE a specific packet
  router.delete('/measurements/:measurement/packets/:timestamp', function (req, res) {
    // Get the measurement and timestamp out of the route path
    var measurement = req.params.measurement
    var dbQuery
    try {
      dbQuery = auxtools.formTimeQuery(req.params, {match: 'exact'})
    }
    catch (err) {
      err.description = req.query
      debug('DELETE /measurements/:measurement/packets/:timestamp error forming query', err)
      res.status(400)
         .json(auxtools.fromError(400, err))
      return
    }
    debug('Request to delete packet at timestamp', dbQuery.timestamp)

    measurement_manager
      .deletePacket(measurement, dbQuery)
      .then(function (result) {
        // The property 'n' holds the number of documents deleted
        if (result.result.n) {
          // Success.
          res.sendStatus(204)
        } else {
          // Couldn't find the doc
          res.sendStatus(404)
        }
      })
      .catch(function (err) {
        debug('DELETE /measurements/:measurement/packets/:timestamp delete error:', err)
        error.sendError(err, res)
      })
  })

  return router

}

module.exports = MeasurementRouterFactory
