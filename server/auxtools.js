/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Useful small utilities.
 */
'use strict'

const url = require('url')
const normalizeUrl = require('normalize-url')

var locationPath = function (originalUrl, protocol, host, name) {
  var base_pathname = url.parse(originalUrl).pathname
  var fullpath = url.format({
    protocol: protocol,
    host    : host,
    pathname: base_pathname + '/' + name
  })
  return normalizeUrl(fullpath)
}

// Given a request header and a name, form a new endpoint
var resourcePath = function (req, name) {
  return locationPath(req.originalUrl, req.protocol, req.get('host'), name)
}

var fromError = function (code, err) {
  var e = {}
  e.message = err.message
  e.code = code
  if (err.description) {
    e.description = err.description
  }
  return e
}


module.exports = {
  locationPath       : locationPath,
  resourcePath       : resourcePath,
  fromError          : fromError
}
