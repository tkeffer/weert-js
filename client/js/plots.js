/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

/**
 * Class representing a single real-time {@link https://plot.ly/javascript Plotly.js} plot.
 * It may have multiple traces.
 *
 * This is basically the "view" of a Model-View-Controller triad.
 */
class Plot {

    /**
     * Construct a Plot object. This constructor is not intended to be used directly. Instead,
     * the static method {@link Plot.createPlot} should be used instead. This avoids having the
     * constructor take a Promise.
     * @param {String} plotly The document <tt>div</tt> where the plot is located. (This
     *    is what's returned by the Plotly function
     *    {@link https://plot.ly/javascript/plotlyjs-function-reference/#plotlynewplot Plotly.newPlot})
     * @param {number} max_age The maximum age that should be shown on the plots in nanoseconds.
     * @param {Object[]} trace_specs An array of objects, one for each trace to be included.
     * @param {String} trace_specs[].obs_type The observation type for this trace.
     */
    constructor(plotly, max_age, trace_specs) {
        this.plotly      = plotly;
        this.max_age     = max_age;
        this.trace_specs = trace_specs;
    }

    /**
     * Update the plot to reflect a changed model.
     * @param {string} event_type If set to <tt>new_packet</tt> then the <tt>event_data</tt> should
     * be a new deep packet that is to be added on to the end of the plot. If set to <tt>reload</tt>
     * then <tt>event_data</tt> should be new x- and y-vectors, along with a new <tt>max_age</tt>.
     * @param {object} event_data The new model data.
     */
    update(event_type, event_data) {
        if (event_type === 'new_packet') {
            this.extend(event_data);
        } else if (event_type === 'reload') {
            this.replace(event_data.packets, event_data.max_age);
        }
    }

    /*
     * Extend the plot with a new data point.
     */
    extend(packet) {
        let Nkeep;
        let x = this.plotly.data[0].x;
        if (x.length) {
            let lastTimestamp = x[x.length - 1];
            let trim_time     = lastTimestamp - this.max_age;
            let first_good    = x.findIndex(function (xval) {
                return xval >= trim_time;
            });

            if (first_good === -1) {
                // All data points have expired. Keep none of them.
                Nkeep = 0;
            } else if (first_good === 0) {
                // They are all good. Don't trim anything
                Nkeep = undefined;
            } else {
                // The points before first_good have expired. Keep the rest.
                Nkeep = x.length - first_good;
            }
        }

        // Each trace gets an index
        let new_xs        = [];
        let new_ys        = [];
        let trace_numbers = [];
        let i             = 0;
        for (let trace_spec of this.trace_specs) {
            new_xs.push([packet.timestamp]);
            new_ys.push([packet.fields[trace_spec.obs_type]]);
            trace_numbers.push(i++);
        }
        return Plotly.extendTraces(this.plotly, {
            x: new_xs,
            y: new_ys
        }, trace_numbers, Nkeep);
    }

    /*
     * Replace the plot data with totally new data.
     */
    replace(packets, max_age) {
        this.max_age = max_age;
        for (let i = 0; i < this.trace_specs.length; i++) {

            let obs_type = this.trace_specs[i].obs_type;

            this.plotly.data[i].x = packets.map(function (packet) {return packet.timestamp;});
            this.plotly.data[i].y = packets.map(function (packet) {return packet.fields[obs_type];});
        }
        Plotly.redraw(this.plotly);
    }

    /**
     * Static method to create a single Plotly.js plot, using a DataManager as a data source.
     * @param {String} plot_div The id of the document <tt>div</tt> where the plot will be put.
     * @param {DataManager} datamanager The {@link DataManager} object to be used as the data source
     * for this plot.
     * @param {Layout} plot_layout A Plotly {@link https://plot.ly/javascript/reference/#layout Layout} object to
     * be used for this plot.
     * @param {Object[]} trace_specs An array of objects, one for each trace to be included.
     * @param {String} trace_specs[].label The label to be used for this trace.
     * @param {String} trace_specs[].obs_type The observation type for this trace.
     * @returns {Promise} A promise to create a {@link Plot} object.
     */
    static createPlot(plot_div, datamanager, plot_layout, trace_specs) {
        // Assemble the trace data.
        let data = [];
        for (let trace of trace_specs) {
            data.push({
                          x   : datamanager.packets.map(function (packet) {return packet.timestamp;}),
                          y   : datamanager.packets.map(function (packet) {return packet.fields[trace.obs_type];}),
                          mode: "lines",
                          type: "scatter",
                          name: trace.label
                      });
        }
        return Plotly.newPlot(plot_div, data, plot_layout)
                     .then(plotly => {
                         // Return the resolved promise of a new Plot object
                         return Promise.resolve(new Plot(plotly, datamanager.max_age, trace_specs));
                     });
    }
}
