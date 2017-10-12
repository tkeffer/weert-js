#!/usr/bin/env node
/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict';

const bodyParser = require('body-parser');
const debug = require('debug')('weert:server');
const http = require('http');
const logger = require('morgan');
const path = require('path');
const express = require('express');
const app = express();

const config = require('./config/config');
const MeasurementManager = require('./services/measurement_manager');
const measurement_router_factory = require('./routes/measurement_routes');
const subsampling = require('./services/subsampling');
const retention_policies = require('./config/retention_policies');

// This type of metadata should probably be in a database,
// but for now, retrieve it from a JSON file
const measurement_config = require('./meta_data/measurement_config');

// Set up the view engine
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'hbs');

// Log all requests to the server to the console
app.use(logger('dev'));
//app.use(logger('combined'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Serve all static files from the "client" subdirectory:
app.use(express.static(path.join(__dirname, '../client')));

// Set up the sub-pub facility
const faye = require('faye');
const bayeux = new faye.NodeAdapter({mount: config.faye.endpoint, timeout: 45});
// Monitor pub-sub clients
bayeux.on('subscribe', function (clientId, channel) {
    debug(`Client ${clientId} subscribed on channel ${channel}`);
});
bayeux.on('unsubscribe', function (clientId, channel) {
    debug(`Client ${clientId} unsubscribed on channel ${channel}`);
});
bayeux.on('disconnect', function (clientId) {
    debug(`Client ${clientId} disconnected`);
});
const faye_client = new faye.Client(`http://localhost:${config.server.port}${config.faye.endpoint}`);

// Set up the database and its managers
const Influx = require('influx');
const influx = new Influx.InfluxDB(config.influxdb);

influx.getDatabaseNames()
      .then(names => {
          // Check to see if the chosen database has been created
          if (!names.includes(config.influxdb.database)) {
              // The database does not exist. Create it.
              let p = influx.createDatabase(config.influxdb.database);
              debug(`Created database '${config.influxdb.database}'`);
              return p;
          } else {
              debug(`Database '${config.influxdb.database}' already exists.`);
              return Promise.resolve();
          }
      })
      .then(() => {
          // Having created or made sure the database exists, set up the retention policies
          var ps = [];
          for (let rp in retention_policies) {
              ps.push(influx.createRetentionPolicy(rp, retention_policies[rp]));
          }
          return Promise.all(ps);
      })
      .then(() => {
          // Create the continuous queries for any measurements.
          return subsampling.create_all_cqs(influx, measurement_config);
      })
      .then(result => {
          debug(`Set up ${result.length} continuous queries`);
          return Promise.resolve();
      })
      .then(() => {

          // Arrange to be notified after each continuous query has been run
          subsampling.setup_all_notices(influx, faye_client, measurement_config);

          // Create a manager for the measurements, using the influx driver
          const measurement_manager = new MeasurementManager(influx, measurement_config);

          // Set up the routes
          app.use(config.server.api, measurement_router_factory(measurement_manager, faye_client));

          // error handlers

          // If we got this far, the request did not match any router. It's a 404.
          // Catch it and forward to error handler
          app.use(function (req, res, next) {
              debug('caught 404');
              let err = new Error('Page not found: ' + req.originalUrl);
              err.status = 404;
              next(err);
          });

          // development error handler
          // will print stacktrace
          if (app.get('env') === 'development') {
              app.use(function (err, req, res, next) {
                  res.status(err.status || 500);
                  res.render('error', {
                      message: err.message,
                      error  : err
                  });
              });
          }

          // production error handler
          // no stacktraces leaked to user
          app.use(function (err, req, res, next) {
              res.status(err.status || 500);
              res.render('error', {
                  message: err.message,
                  error  : {}
              });
          });

          /*
           * Start the server
           */

          let server = http.createServer(app);
          // Trap any error events and exit
          server.on('error', (err) => {
              console.log('Unable to start server');
              switch (err.errno) {
                  case 'EADDRINUSE':
                      console.log('Port', err.port, 'is already in use.');
                      break;
                  default:
                      console.log(err);
              }
              process.exit(1);
          });

          // Attach the Faye pub-sub engine
          bayeux.attach(server);

          server.listen(config.server.port);
          console.log('Listening on port', config.server.port);
      })
      .catch(err => {
          console.error(`Error creating Influx database!`, err);
          process.exit(1);
      });
