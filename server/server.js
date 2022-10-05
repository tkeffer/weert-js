#!/usr/bin/env node/*
/* Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
*
* See the file LICENSE for your full rights.
*/

"use strict";

/*
 * This first part is pretty much boilerplate for any Express
 * application.
 */
import bodyParser from "body-parser";
import compression from "compression";
import debugFactory from "debug";

const debug = debugFactory("weert:server");
import http from "http";
import logger from "morgan";
import express from "express";

import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Set up the view engine
app.set("views", path.join(__dirname, "./views"));
// Use Handlebars for the view engine.
app.set("view engine", "hbs");

// Log all requests to the server to the console
app.use(logger("common"));
//app.use(logger('combined'));

// Using compression can result in an order-of-magnitude savings for
// longer packet arrays
app.use(compression());

// Allow the server to parse JSON in the HTTP body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Serve all static files from the "client" subdirectory:
app.use(express.static(path.join(__dirname, "../client/dist")));

/*
 * Now comes the WeeRT-specific stuff
 */
import config from "./config/config.js";

import MeasurementManager from "./services/measurement_manager.js";
import auth_router_factory from "./routes/auth_routes.js";
import packet_router_factory from "./routes/packet_routes.js";
import stats_router_factory from "./routes/stats_routes.js";
import about_router_factory from "./routes/about_routes.js";
import subsampling from "./services/subsampling.js";
import retention_policies from "./config/retention_policies.js";
import { setup } from "./services/client_notifier.js";

// This type of metadata should probably be in a database,
// but for now, retrieve it from a JSON file
import measurement_config from "./meta_data/measurement_config.json" assert { type: "json" };

// Set up the database and its managers
import Influx from "influx";

const influx = new Influx.InfluxDB(config.influxdb);

influx
  .getDatabaseNames()
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
    // Return a promise to resolve setting up all the retention policies.
    return Promise.all(ps);
  })
  .then(result => {
    debug(`Finished setting up ${result.length} retention policies`);

    // Create a manager for the measurements, using the influx driver
    const measurement_manager = new MeasurementManager(influx, measurement_config);

    // Arrange to have all cron tasks run. (This includes running subsampling at regular intervals.)
    subsampling.setup_cron(measurement_manager);

    // Set up the basic authorization routes
    app.use(config.server.api, auth_router_factory(config.users));

    // Set up the packet routes
    app.use(config.server.api, packet_router_factory(measurement_manager));

    // Set up the statistics routes
    app.use(config.server.api, stats_router_factory(measurement_manager));

    // Set up the "about" routes
    app.use(config.server.api, about_router_factory());

    /*
     * Error handlers. If we got this far, the request did not match any router. It's a 404.
     * Catch it and forward to error handler
     */
    app.use(function(req, res, next) {
      debug("caught 404");
      let err    = new Error("Page not found: " + req.originalUrl);
      err.status = 404;
      next(err);
    });

    // Development error handler --- rendering the full "err" object will
    // include the stack (and lots of other stuff)
    if (app.get("env") === "development") {
      app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        // Render the error view. Include the err object
        res.render("error", {
          message: err.message,
          error: err
        });
        debug("error:", err);
      });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      // Render the error view. No err object
      res.render("error", {
        message: err.message,
        error: {}
      });
    });

    /*
     * Start the server
     */
    let httpServer = http.createServer(app);
    // Trap any error events and exit
    httpServer.on("error", err => {
      console.log("Unable to start server");
      switch (err.errno) {
        case "EADDRINUSE":
          console.log("Port", err.port, "is already in use.");
          break;
        default:
          console.log(err);
      }
      process.exit(1);
    });

    // Set up the system to notify remote clients using socket.io.
    setup(httpServer);

    // Start listening!
    httpServer.listen(config.server.port);
    console.log("Listening on port", config.server.port);
  })
  .catch(err => {
    console.error(`Error creating Influx database!`, err);
    process.exit(1);
  });
