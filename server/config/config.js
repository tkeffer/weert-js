/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Configuration information for WeeRT
 */
export default {
  // Set to 0 (zero) for no debugging, 1 (one) for debugging.
  debug: 1,

  // Number of concurrent async operations allowed.
  concurrency: 100,

  // Users and their passwords
  users: {
    weert: "weert"
  },

  // Configuration info for the WeeRT server itself
  server: {
    port: 3000,
    api: "/api/v1"
  },

  // Information about connecting to the InfluxDB host
  influxdb: {
    host: "localhost",
    port: 8086,
    username: "root",
    password: "root",
    database: "weert",
    cq_delay: 5000 //TODO: May not be needed anymore
  },

  // Configuration for socket.io facility
  socket_io: {}
};
