/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var data_source = {
    out_temp: {
        retention_time: 3600000,
        obs_types     : ["outside_temperature", "dewpoint_temperature"]
    }
};


/** @classdesc Class that manages the data connection back to the server.
 *  @property {Number[]} x Array of timestamps in milliseconds.
 *  @property {Object} y An object holding the y-values. When keyed with an observation type, it
 *  returns an Array of y-values.
 *  @property {Number[]} y.obs_type An array of y-values for observation type <tt>obs_type</tt>.
 */
class DataManager {

    /**
     * Create a DataManager object. This will merely create the object. To load it with data,
     * use the function {@link DataManager.setMaxAge}.
     * @constructor
     * @param {String} measurement The InfluxDB measurement to use
     * @param {Object} options A hash of options:
     * @param {String[]} options.obs_types An array specifying the observation types to be managed.
     * @param {String} [options.platform=default_platform] The platform.
     * @param {String} [options.stream=default_stream] The stream.
     * @param {String} [options.faye_endpoint="/api/v1/faye"] The endpoint where the Faye pub-sub facility can be
     *     found.
     */
    constructor(measurement, options) {
        this.measurement = measurement;
        this.obs_types   = options.obs_types;
        this.platform    = options.platform || "default_platform";
        this.stream      = options.stream || "default_stream";
        let fe           = options.faye_endpoint || '/api/v1/faye';

        this.max_age   = undefined;
        this.callbacks = [];
        this.x         = [];
        this.y         = {};
        for (let obs_type of this.obs_types)
            this.y[obs_type] = [];

        this.faye_client = new Faye.Client("http://" + window.location.host + fe);
        this.faye_client.subscribe("/" + measurement, packet => {

            // First, trim off any stale data points off the front of the
            // x and y arrays.
            if (this.x.length) {
                let trim_time = this.x[this.x.length - 1] - this.max_age;
                while (this.x[0] < trim_time) {
                    this.x.shift();
                    for (let obs_type of this.obs_types) {
                        this.y[obs_type].shift();
                    }
                }
            }

            // Now push the new data point on to the end
            this._pushPacket(packet);
        });
    }

    /**
     * Subscribe to changes in the data model.
     *
     * @param {Function} callback This function will be called (with no arguments) should the data model change.
     */
    subscribe(callback) {
        this.callbacks.push(callback);
    }


    /**
     * Set how far back in time the data manager will manage. This will force a data reload.
     * @param {Number} [max_age=1200000] The max age in milliseconds that will be requested from the
     *     server and maintained by the DataManager. The default is <tt>1200000</tt> milliseconds,
     *     or 20 minutes.
     * @return {Promise} A promise to resolve to the number of packets returned from the server.
     */
    setMaxAge(max_age) {
        this.max_age = max_age;
        let since    = Date.now() - age;
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
                .then(results => {
                    // Extract the array out of the AJAX results
                    let packet_array = results[0];
                    // Go through the array of packets, adding to my internal array of
                    // x- and y-values.
                    for (packet of packet_array) {
                        this._pushPacket(packet);
                    }
                    // Let my subscribers know I've changed.
                    this._notify_subscribers();

                    return Promise.resolve(packet_array.length);
                });
    }

    _pushPacket(packet) {
        this.x.push(packet.timestamp / 1000000);
        for (obs_type of this.obs_types) {
            let val = packet.fields[obs_type] === undefined ? null : packet.fields[obs_type];
            this.y[obs_type].push(val);
        }
    }

    _notify_subscribers() {
        for (callback of this.callbacks) {
            callback();
        }
    }

    // /**
    //  * Create a DataManager object, then load it with data.
    //  * @param {String} measurement The InfluxDB measurement to use
    //  * @param {Object} options A hash of options:
    //  * @param {String[]} options.obs_types An array specifying the observation types to be managed.
    //  * @param {String} [options.platform=default_platform] The platform.
    //  * @param {String} [options.stream=default_stream] The stream.
    //  * @param {String} [options.faye_endpoint="/api/v1/faye"] The endpoint where the Faye pub-sub facility can be
    //  *     found.
    //  * @param {Number} max_age How many milliseconds of data that should be retrieved and retained from the server.
    //  * @return {Promise} Return a promise for a DataManager, configured and loaded with <tt>options.max_age</tt>
    //  *     data points.
    //  */
    // static createDataManager(measurement, options, max_age) {
    //     let data_manager = new DataManager(measurement, options);
    //     return data_manager.setMaxAge(max_retained_age)
    //                        .then(N => {
    //                            console.log(N, "packets returned from server");
    //                            return Promise.resolve(data_manager);
    //                        });
    // }
}
