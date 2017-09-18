/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
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
    const wrapped = [deep_packet]
    return this.influx
               .writeMeasurement(measurement, wrapped)
  }

  find_packet (measurement, timestamp, platform = undefined, stream = undefined) {

    let query_string = `SELECT * FROM ${measurement} WHERE time=${timestamp}`
    if (platform)
      query_string += ` AND platform=${platform}`
    if (stream)
      query_string += ` AND stream=${stream}`
    console.log('query_string=', query_string)
    return this.influx
               .query(query_string)
               .then(results => {
                 return Promise.resolve(results[0])
               })
  }
}

module.exports = MeasurementManager