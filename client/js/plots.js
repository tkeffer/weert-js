/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

/**
 * Class representing a single real-time {@link https://plot.ly/javascript Plotly.js} plot.
 * It may have multiple traces.
 */
class Plot {

    /**
     * Construct a Plot object. This constructor is not intended to be used directly. Instead,
     * the static method {@link Plot.createPlot} should be used instead.
     * @param {String} plot_div The id of the document <tt>div</tt> where the plot is located. (This
     *    is what's returned by the Plotly function
     *    {@link https://plot.ly/javascript/plotlyjs-function-reference/#plotlynewplot Plotly.newPlot})
     */
    constructor(plot_div) {
        this.plot_div = plot_div;
    }

    /**
     * Update the plot to reflect a changed model
     */
    update(event_type, event_data) {
        Plotly.redraw(this.plot_div);
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
                          x   : datamanager.x,
                          y   : datamanager.y[trace.obs_type],
                          mode: "lines",
                          type: "scatter",
                          name: trace.label
                      });
        }
        return Plotly.newPlot(plot_div, data, plot_layout)
                     .then(plotly => {
                         // Return the resolved promise of a new Plot object
                         return Promise.resolve(new Plot(plot_div));
                     });
    }
}
