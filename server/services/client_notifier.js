/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

'use strict';

const debug         = require('debug')('weert:client_notifier');
const faye          = require('faye');
const config        = require('../config/config');
const event_emitter = require('./event_emitter');

// Set up the sub-pub facility
const setup = function () {

    const faye_client = new faye.Client(`http://localhost:${config.server.port}${config.faye.endpoint}`);

    event_emitter.on('NEW_PACKET', (packet, measurement) => {
        // Notify any subscribers via the pub-sub facility
        faye_client.publish(`/${measurement}`, packet)
                   .then(() => {
                       debug(`Published new packet ${new Date(packet.timestamp)} ` +
                             `to ${measurement}`);
                   })
                   .catch((err) => {
                       debug(`Error publishing new packet ${new Date(packet.timestamp)} ` +
                             `to ${measurement}. (${err.message})`);
                   });
    });

    event_emitter.on('NEW_AGGREGATE', (record, measurement) => {
        // Notify any subscribers via the pub-sub facility
        faye_client.publish(`/${measurement}`, record)
                   .then(() => {
                       debug(`Published new aggregated record ${new Date(record.timestamp)} ` +
                             `to ${measurement}`);
                   })
                   .catch((err) => {
                       debug(`Error publishing new aggregated record ${new Date(record.timestamp)} ` +
                             `to ${measurement}. (${err.message})`);
                   });
    });

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
    return bayeux;
};

module.exports =
    {
        setup,
    };