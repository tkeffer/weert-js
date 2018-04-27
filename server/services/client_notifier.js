/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

"use strict";

const Server = require("socket.io");
const debug = require("debug")("weert:client_notifier");

const config = require("../config/config");
const event_emitter = require("./event_emitter");

// Set up the pub-sub facility
const setup = function(httpServer) {
  let io = new Server(httpServer, config.socket_io);

  io.on("connection", function(socket) {
    debug(`Client ${socket.id} connected`);

    socket.on("disconnect", () => {
      debug(`Client ${socket.id} disconnected`);
    });

    socket.on("error", (err)=>{
      debug(`Socket.io error ${err} on client ${socket.id}`)
    })

    event_emitter.on("NEW_PACKET", (packet, measurement) => {
      // TODO: Rather than the measurement being the event name, it should be "NEW_PACKET"
      socket.emit(`/${measurement}`, packet);
    });

    event_emitter.on("NEW_AGGREGATE", (record, measurement) => {
      // TODO: Rather than the measurement being the event name, it should be "NEW_PACKET"
      socket.emit(`/${measurement}`, record);
    });
  });
};

module.exports = {
  setup
};
