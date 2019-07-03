/*
 * Copyright (c) 2016-2019 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Routes about the WeeRT process.
 */

"use strict";

const debug   = require("debug")("weert:routes");
const express = require("express");
const os = require("os");
const pjson = require('../../package.json');

const AboutRouterFactory = function() {

  const router = express.Router();

  router.get("/about", function(req, res) {

    const results = {
      server_uptime: os.uptime(),
      weert_uptime: process.uptime(),
      node_version: process.version,
      weert_version: pjson.version,
    };
    res.json(results);

  });

  return router;
};

module.exports = AboutRouterFactory;