/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

'use strict'

/*
 * Class to manage the InfluxDB database
 */

class MeasurementManager {

  constructor (influx, options) {
    this.influx = influx
  }

  insert_packet (measurement, deep_packet) {
    var wrapped = [deep_packet]
    return this.influx.writePoints(wrapped);
  }
}

module.exports = MeasurementManager