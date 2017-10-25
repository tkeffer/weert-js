/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Simple authorization routing
 *
 */

"use strict";

var debug   = require('debug')('weert:auth');
var express = require('express');
var auth    = require('basic-auth');

var AuthRouterFactory = function (users) {

    var router = express.Router();

    // Check the authorization
    router.use('/*', function (req, res, next) {
        switch (req.method) {
            // Everyone can do GET
            case 'GET':
                next();
                break;
            // You have to be authorized to do POST, DELETE, or PUT
            case 'POST':
            case 'DELETE':
            case 'PUT':
                let user_info = auth(req);
                if (checkAuth(user_info))
                    next();
                else
                    unauthorized(req, res, user_info);
                break;
            default:
                unauthorized(req, res, user_info);
        }

    });

    let checkAuth = function (user_info) {
        // The parameter user_info will be undefined if there was no Authorization header
        if (!user_info)
            return false;
        // Make sure the user exists, and the given password matches
        return (users[user_info.name] !== undefined && users[user_info.name] === user_info.pass);
    };

    // Return the built router
    return router;
};

var unauthorized = function (req, res, user_info) {
    res.status(403).send("Unauthorized");
    debug(`User ${user_info.user} (IP ${req.ip}) unauthorized for ${req.method} to ${req.url}`);
};

module.exports = AuthRouterFactory;


