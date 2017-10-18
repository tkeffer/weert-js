/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";


/** @classdesc Class that manages the data connection back to the server.
 *  @property {Number[]} x Array of timestamps in milliseconds.
 *  @property {Object} y An object holding the y-values. When keyed with an observation type, it
 *  returns an Array of y-values.
 *  @property {Number[]} y.obs_type An array of y-values for observation type <tt>obs_type</tt>.
 */
class DataManager {

    /**
     * Create a DataManager object.
     * @constructor
     * @param {String} measurement The InfluxDB measurement to use
     * @param {Object} options A hash of options:
     * @param {String} options.platform The platform. Default is <tt>default_platform</tt>.
     * @param {String} options.stream The stream. Default is <tt>default_stream</tt>.
     * @param {String} options.faye_endpoint The endpoint where the Faye pub-sub facility can be found.
     * Default is <tt>/api/v1/faye</tt>.
     */
    constructor(measurement, options) {
        this.measurement = measurement;
        this.platform    = options.platform || "default_platform";
        this.stream      = options.stream || "default_stream";

        this.callbacks = [];
        this.x = [];
        this.y = {};
        let fe = options.faye_endpoint || '/api/v1/faye'

        this.faye_client = new Faye.Client("http://" + window.location.host + faye_endpoint);
        this.faye_client.subscribe("/" + measurement, function (packet) {

        });
    }

    subscribe(callback) {
        this.callbacks.push(callback);
    }

    load_since(since) {
        $.ajax({
                   url     : "http://" + window.location.host + "/api/v1/measurements/" +
                             this.measurement + "/packets",
                   data    : {
                       start   : since,
                       platform: this.platform,
                       stream  : this.stream
                   },
                   method  : "GET",
                   dataType: "JSON"
               })
         .then(results => {
             let packet_array = results[0];

             // Go through the array of packets, building x and y vectors. The
             // x vector will be a simple array. The y vectors will be
             for (packet of packet_array) {
                 this.x.push(packet.timestamp / 1000000);
                 for (obs_type in packet.fields)
                     if (packet.fields.hasOwnProperty(obs_type)) {
                         if (this.y[obs_type] === undefined) {
                             this.y[obs_type] = [];
                         }
                         this.y[obs_type].push(packet.fields[obs_type]);
                     }
             }

             this.x       = packet_array.map(function (packet) {
                 return packet.timestamp / 1000000;
             });
             let y_arrays = {};
             for (let obs_type in this.obs_types) {
                 y_arrays[obs_type] = packet_array.map(function (packet) {
                     return packet.fields[obs_type];
                 });
             }
             this._notify_subscribers('load', {x: time_array, y: y_arrays});
         });
    }

    _notify_subscribers(event_type, val) {
        for (let callback in this.callbacks[event_type]) {
            callback(event_type, val);
        }
    }

    static createDataManager(options) {
        let data_manager = new DataManager();
        data_manager.load_since();
    }
}
