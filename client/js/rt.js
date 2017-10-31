/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

// This is the list of plots to be constructed for each document div.
const plot_list = [
    {
        plotly: 'windspeed-div',
        layout: {
            xaxis: {type: "date"},
            yaxis: {rangemode: "nonnegative"},
            title: "Wind Speed (mph)"
        },
        traces: [
            {obs_type: 'wind_speed'}
        ]
    },
    {
        plotly: 'outtemp-div',
        layout: {
            xaxis: {type: "date"},
            title: "Outside Temperature (°F)"
        },
        traces: [
            {obs_type: 'outside_temperature', label: 'Temperature'},
            {obs_type: 'dewpoint_temperature', label: 'Dewpoint'}
        ]
    },
    {
        plotly: 'radiation-div',
        layout: {
            xaxis: {type: "date"},
            yaxis: {rangemode: "nonnegative"},
            title: "Solar Radiation (W/m²)"
        },
        traces: [
            {obs_type: 'radiation_radiation', label: 'Radiation'}
        ]
    }
];

const recent_plot_group = {
    time_group : "recent",
    measurement: "wxpackets",
    plot_list  : plot_list
};

const day_plot_group = {
    time_group : "day",
    measurement: "wxrecords",
    plot_list  : plot_list
};

const weert_config = {
    obs_types    : [],
    platform     : "default_platform",
    stream       : "default_stream",
    faye_endpoint: "/api/v1/faye"
};

// Accumulate a list of observation types:
for (let plot of plot_list) {
    for (let trace of plot.traces) {
        weert_config.obs_types.push(trace.obs_type);
    }
}

const initial_recent_max_age = 300000000000;       // 5 minutes in nanoseconds
const initial_day_max_age    = 27 * 3600000000000;  // 27 hours in nanoseconds

function readyTemplate(data_manager) {
    return new Promise(function (resolve) {
        // The DOM has to be ready before we can select the SVG area.
        $(function () {
            // Compile the console template
            let source           = $("#wx-console-template").html();
            let console_template = new Handlebars.compile(source);

            // Render the last packet if one is available
            let packet = data_manager.lastPacket();
            if (packet) {
                $("#wx-console-area").html(console_template(packet));
            }
            // Set the callback for new packets
            data_manager.subscribe((event_type, new_packet) => {
                if (event_type === 'new_packet') {
                    // Render the Handlebars template showing the new conditions
                    $("#wx-console-area").html(console_template(new_packet));
                }
            });
            resolve(console_template);
        });
    });
}

function readyWindCompass(data_manager) {
    return new Promise(function (resolve) {
        // The DOM has to be ready before we can select the SVG area.
        $(function () {
            let wind_compass = new WindCompass();
            // set the callback for new packets
            data_manager.subscribe((event_type, new_packet) => {
                if (event_type === 'new_packet') {
                    // Update the wind compass
                    wind_compass.updateWind([
                                                new_packet.timestamp / 1000000,
                                                new_packet.fields.wind_dir,
                                                new_packet.fields.wind_speed
                                            ]);
                }
            });

            resolve(wind_compass);
        });
    });
}

function readyPlotGroup(data_manager, plot_group) {
    return new Promise(function (resolve) {
        $(function () {
            let promises = [];
            for (let plot_spec of plot_group.plot_list) {
                promises.push(
                    Plot.createPlot(
                        plot_group.time_group + '-' + plot_spec.plotly,
                        data_manager,
                        plot_spec.layout,
                        plot_spec.traces)
                );
            }
            Promise.all(promises)
                   .then(plots => {
                       // Set the callback for new packets
                       for (let plot of plots) {
                           data_manager.subscribe(Plot.prototype.update.bind(plot));
                       }
                       resolve(plots);
                   });
        });
    });
}

var recent_data_manager;
var day_data_manager;

// Allow changing the total time span displayed by the "recent" plots:
var changeSpan = function (x) {
    recent_data_manager.setMaxAge(x.value * 60000000000);
};

DataManager.createDataManager(recent_plot_group.measurement,
                              Object.assign({}, weert_config, {max_age: initial_recent_max_age}))
           .then(rdmgr => {
               recent_data_manager = rdmgr;
               return Promise.all([
                                      readyTemplate(recent_data_manager),
                                      readyWindCompass(recent_data_manager),
                                      readyPlotGroup(recent_data_manager, recent_plot_group)
                                  ]);

           })
           .then(() => {
               console.log("'Recent' data manager ready");
           });
DataManager.createDataManager(day_plot_group.measurement,
                              Object.assign({}, weert_config, {max_age: initial_day_max_age}))
           .then(ddmgr => {
               day_data_manager = ddmgr;
               return readyPlotGroup(day_data_manager, day_plot_group);
           })
           .then(() => {
               console.log("'Day' data manager ready");
           });

Handlebars.registerHelper("formatTimeStamp", function (ts) {
    return new Date(ts / 1000000);
});

Handlebars.registerHelper("precision", function (val, digits) {
    if (val === null || val === undefined) {
        return "N/A";
    } else {
        return val.toPrecision(digits);
    }
});

Handlebars.registerHelper("fixed", function (val, digits) {
    if (val === null || val === undefined) {
        return "N/A";
    } else {
        return val.toFixed(digits);
    }
});
