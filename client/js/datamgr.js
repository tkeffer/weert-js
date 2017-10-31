/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

/** @classdesc Class that manages the data connection back to the server. This is basically the "model"
 * part of a Model-View-Controller triad.
 *  @property {Number[]} x Array of timestamps in milliseconds.
 *  @property {Object} y An object holding the y-values. When keyed with an observation type, it
 *  returns an Array of y-values.
 */
class DataManager {

    /**
     * Create a DataManager object. This will merely create the object and not load it. To
     * create and load, use static function {@link createDataManager}.
     * @constructor
     * @param {String} measurement The InfluxDB measurement to use
     * @param {Object} options A hash of options:
     * @param {String[]} options.obs_types An array specifying the observation types to be managed.
     * @param {String} [options.platform=default_platform] The platform.
     * @param {String} [options.stream=default_stream] The stream.
     * @param {number} [options.max_age] The maximum age to be retained in nanoseconds.
     * Default is 1200000 (20 minutes).
     * @param {String} [options.faye_endpoint="/api/v1/faye"] The endpoint where the Faye pub-sub facility can be
     *     found.
     */
    constructor(measurement, options) {
        this.measurement = measurement;
        this.obs_types   = options.obs_types;
        this.platform    = options.platform || "default_platform";
        this.stream      = options.stream || "default_stream";
        this.max_age     = options.max_age || 1200000000000;
        let fe           = options.faye_endpoint || '/api/v1/faye';

        // TODO: Not sure it's necessary to maintain the internal arrays any more.
        this.packets     = [];
        this.callbacks   = [];
        this.faye_client = new Faye.Client("http://" + window.location.host + fe);
        this.faye_client.subscribe("/" + measurement, packet => {

            // First, trim off any stale data points off the front of the
            // packet array
            if (this.packets.length) {
                let lastTimestamp = this.packets[this.packets.length - 1].timestamp;
                let trim_time     = lastTimestamp - this.max_age;
                let first_good    = this.packets.findIndex(function (packet) {
                    return packet.timestamp >= trim_time;
                });

                // If there was no good packet, trim them all. Otherwise, just
                // up to the first good packet
                let Ntrim = first_good === -1 ? this.packets.length : first_good;
                // Trim off the front
                this.packets.splice(0, Ntrim);
            }

            // Now push the new packet on to the end
            this.packets.push(packet);

            // Let my subscribers know I've changed.
            this._notify_subscribers('new_packet', packet);
        });
    }

    lastPacket() {
        return this.packets[this.packets.length - 1];
    }

    /**
     * Subscribe to changes in the data model.
     *
     * @param {Function} callback A function with two arguments. The first argument will be the event type,
     * the second the event data.
     */
    subscribe(callback) {
        this.callbacks.push(callback);
    }


    /**
     * Set how far back in time the data manager will manage. This will force a data reload.
     * @param {Number} [max_age=1200000000000] The max age in nanoseconds that will be requested from the
     *     server and maintained by the DataManager. The default is <tt>1200000000000</tt> nanoseconds,
     *     or 20 minutes.
     * @return {Promise} A promise to resolve to the number of packets returned from the server.
     */
    setMaxAge(max_age) {
        this.max_age = max_age || 1200000000000;
        // Convert to nanoseconds
        let since = Date.now() * 1000000 - this.max_age;
        return $.ajax({
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
                .then(packet_array => {

                    // Replace the existing packet array:
                    this.packets = packet_array;

                    // Let my subscribers know I've changed.
                    this._notify_subscribers('reload', {packets: this.packets, max_age: max_age});

                    return Promise.resolve(packet_array.length);
                });
    }

    /**
     * Static method to create and load a DataManager object with data.
     * @param {String} measurement The InfluxDB measurement to use
     * @param {number} max_age The maximum age to be retained in nanoseconds.
     * @param {Object} options A hash of options:
     * @param {String[]} options.obs_types An array specifying the observation types to be managed.
     * @param {String} [options.platform=default_platform] The platform.
     * @param {String} [options.stream=default_stream] The stream.
     * @param {number} [options.max_age] The maximum age to be retained in nanoseconds.
     * Default is 1200000000000 (20 minutes).
     * @param {String} [options.faye_endpoint="/api/v1/faye"] The endpoint where the Faye pub-sub facility can be
     *     found.
     */
    static createDataManager(measurement, options) {
        let manager = new DataManager(measurement, options);
        return manager.setMaxAge(options.max_age)
                      .then(result => {
                          return Promise.resolve(manager);
                      });
    }

    _notify_subscribers(event, event_data) {
        for (let callback of this.callbacks) {
            callback(event, event_data);
        }
    }
}
