#!/usr/bin/env node
/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict'

const bodyParser = require('body-parser')
const debug = require('debug')('weert:server')
const http = require('http')
const logger = require('morgan')
const path = require('path')
const express = require('express')
const app = express()
const Influx = require('influx')

const config = require('./config')
const MeasurementManager = require('./services/measurement_manager')
const measurement_router_factory = require('./routes/measurement_routes')

// Set up the view engine
app.set('views', path.join(__dirname, './views'))
app.set('view engine', 'hbs')

// Log all requests to the server to the console
app.use(logger('dev'))
//app.use(logger('combined'));

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

// Set up the database and its managers
const influx = new Influx.InfluxDB(config.influxdb)

influx.getDatabaseNames()
      .then(names => {
        // Check to see if the chosen database has been created
        if (!names.includes(config.influxdb.database)) {
          return influx.createDatabase(config.influxdb.database)
        }
        return Promise.resolve()
      })
      .then(() => {

        // Create a manager for the measurements, using the influx driver
        const measurement_manager = new MeasurementManager(influx)

        // Set up the routes
        app.use(config.server.api, measurement_router_factory(measurement_manager))

        // error handlers

        // If we got this far, the request did not match any router. It's a 404.
        // Catch it and forward to error handler
        app.use(function (req, res, next) {
          debug('caught 404')
          let err = new Error('Page not found: ' + req.originalUrl)
          err.status = 404
          next(err)
        })

        // development error handler
        // will print stacktrace
        if (app.get('env') === 'development') {
          app.use(function (err, req, res, next) {
            res.status(err.status || 500)
            res.render('error', {
              message: err.message,
              error  : err
            })
          })
        }

        // production error handler
        // no stacktraces leaked to user
        app.use(function (err, req, res, next) {
          res.status(err.status || 500)
          res.render('error', {
            message: err.message,
            error  : {}
          })
        })

        /*
         * Start the server
         */

        let server = http.createServer(app)
        // Trap any error events and exit
        server.on('error', (err) => {
          console.log('Unable to start server')
          switch (err.errno) {
            case 'EADDRINUSE':
              console.log('Port', err.port, 'is already in use.')
              break
            default:
              console.log(err)
          }
          process.exit(1)
        })

        server.listen(config.server.port)
        console.log('Listening on port', config.server.port)
      })
      .catch(err => {
        console.error(`Error creating Influx database!`, err)
      })
