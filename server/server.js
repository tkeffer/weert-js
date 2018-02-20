#!/usr/bin/env node
/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

'use strict';

/*
 * This first part is pretty much boilerplate for any Express
 * application.
 */
const bodyParser  = require('body-parser');
const compression = require('compression');
const debug       = require('debug')('weert:server');
const http        = require('http');
const logger      = require('morgan');
const path        = require('path');
const express     = require('express');
const app         = express();


// Set up the view engine
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'hbs');

// Log all requests to the server to the console
//app.use(logger('combined'));
app.use(logger('dev'));

// Using compression can result in an order-of-magnitude savings for
// longer packet arrays
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Serve all static files from the "client" subdirectory:
app.use(express.static(path.join(__dirname, '../client/dist')));

/*
 * Now comes the WeeRT-specific stuff
 */
const config                = require('./config/config');
const MeasurementManager    = require('./services/measurement_manager');
const auth_router_factory   = require('./routes/auth_routes');
const packet_router_factory = require('./routes/packet_routes');
const stats_router_factory  = require('./routes/stats_routes');
const subsampling           = require('./services/subsampling');
const retention_policies    = require('./config/retention_policies');
// This type of metadata should probably be in a database,
// but for now, retrieve it from a JSON file
const measurement_config = require('./meta_data/measurement_config');

// Set up the sub-pub facility
const faye   = require('faye');
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
              debug(`Creating database '${config.influxdb.database}'`);
              return influx.createDatabase(config.influxdb.database);
          } else {
              debug(`Database '${config.influxdb.database}' already exists.`);
              return Promise.resolve();
          }
      })
      .then(() => {
          // Having created or made sure the database exists, set up the retention policies
          let ps = [];
          for (let rp in retention_policies) {
              ps.push(influx.createRetentionPolicy(rp, retention_policies[rp]));
          }
          return Promise.all(ps);
      })
      .then((result) => {
          debug(`Set up ${result.length} retention policies`);

          // Create the continuous queries for any measurements.
          return subsampling.create_all_cqs(influx, measurement_config)
                            .then(result => {
                                debug(`Set up ${result.length} continuous queries`);
                                return Promise.resolve();
                            })
                            .catch(err => {
                                debug("Error creating CQs:", err);
                                return Promise.reject(err);
                            });
      })
      .then(() => {

          // Create a manager for the measurements, using the influx driver
          const measurement_manager = new MeasurementManager(influx, measurement_config);

          // Arrange to be notified after each continuous query has been run
          subsampling.setup_all_notices(measurement_manager, faye_client, measurement_config);

          // Set up the basic authorization
          app.use(config.server.api, auth_router_factory(config.users));

          // Set up the packet routes
          app.use(config.server.api, packet_router_factory(measurement_manager, faye_client));

          // Set up the statistics routes
          app.use(config.server.api, stats_router_factory(measurement_manager));

          /*
           * Error handlers. If we got this far, the request did not match any router. It's a 404.
           * Catch it and forward to error handler
           */
          app.use(function (req, res, next) {
              debug('caught 404');
              let err    = new Error('Page not found: ' + req.originalUrl);
              err.status = 404;
              next(err);
          });

          // Development error handler --- rendering the full "err" object will
          // include the stack (and lots of other stuff)
          if (app.get('env') === 'development') {
              app.use(function (err, req, res, next) {
                  res.status(err.status || 500);
                  res.render('error', {
                      message: err.message,
                      error  : err
                  });
                  debug('error:', err);
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

          // Start listening!
          server.listen(config.server.port);
          console.log('Listening on port', config.server.port);
      })
      .catch(err => {
          console.error(`Error creating Influx database!`, err);
          process.exit(1);
      });

