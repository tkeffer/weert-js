/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

/** Class representing a group of real-time {@link https://plot.ly/javascript Plotly.js} plots.*/
class PlotGroup {
    constructor() {
    }

    static createGroup(options) {
        let promises = [];
        for (let plot of options.plot_list) {
            promises.push(PlotGroup.createPlot(plot, options.time_group + '-' + plot.plot_div));
        }
        return Promise.all(promises);
    }

}

/**
 * Class representing a single real-time {@link https://plot.ly/javascript Plotly.js} plot.
 * It may have multiple traces.
 */
class Plot {

    /**
     * Construct a Plot object
     * @param {HTMLDivElement} plotly The object returned by the Plotly.js
     * function {@link https://plot.ly/javascript/plotlyjs-function-reference/#plotlynewplot Plotly.newPlot}.
     * This is actually a <tt>HTMLDivElement</tt>.
     * @param {String[]} obs_types An array of strings, containing the observation type of each trace.
     */
    constructor(plotly, obs_types) {
        this.plotly    = plotly;
        this.obs_types = obs_types;
    }

    /**
     * Replace the internal data set used by the plot.
     * @param {Object} update - Holds the new data
     * @param {Number[]} update.x - An array holding the new timestamps in milliseconds
     * @param {Array[]} update.y - An array, one for each trace, holding the new y-values
     */
    reload(update) {
        for (trace_index in update.y){

        }
    }

    /**
     * Static method to create a single Plotly.js plot, using the given data set.
     * @param {String} plot_div The name of the document <tt>div</tt> where the plot will be put.
     * @param {Object} plot A hash holding the specs for the plot.
     * @param {Object[]} plot.traces An array of objects, one for each trace to be included.
     * @param {String} plot.traces[].label The label to be used for this trace.
     * @param {String} plot.traces[].obs_type The observation type for this trace.
     * @param {Number[]} plot.traces[].x An array of timestamps (in milliseconds) for this trace
     * @param {Number[]} plot.traces[].y An array of y-values for this trace.
     * @param {Layout} plot.layout A Plotly {@link https://plot.ly/javascript/reference/#layout Layout} object.
     * @returns {Promise} A promise to create a {@link Plot} object.
     */
    static createPlot(plot_div, plot) {
        let data = [];
        for (var trace of plot.traces) {
            // Just use a place holder for x and y. They will be updated later
            data.push({
                          x   : trace.x,
                          y   : trace.y,
                          mode: "lines",
                          type: "scatter",
                          name: trace.label
                      });
        }
        return Plotly.newPlot(plot_div, data, plot.layout)
                     .then(plotly => {

                         // Assemble an array of observation types this plot is to display
                         let obs_types = plot.traces.map(trace => {
                             return trace.obs_type;
                         });

                         let plot = new Plot(plotly, obs_types);

                         return Promise.resolve(plot);
                     });
    }
}
