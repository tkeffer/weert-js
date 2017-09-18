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
    console.log('deep packet about to be inserted=', deep_packet)
    var wrapped = [deep_packet]
    return this.influx
               .writeMeasurement(measurement, wrapped)
  }

  find_packet (measurement, timestamp, platform = undefined, stream = undefined) {

    var query_string = `SELECT * FROM ${measurement} WHERE time=${timestamp}`
    if (platform)
      query_string += ' AND platform=${platform}'
    if (stream)
      query_string += ' AND stream=${stream}'
    console.log("query_string=", query_string);
    this.influx
        .query(query_string)
        .then(results => {
          console.log('results=', results)
        })
  }
}

module.exports = MeasurementManager