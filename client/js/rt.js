/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

// This is the list of plots to be constructed for each document plot group div.
const plot_group_list = [
    {
        div_root: 'windspeed-div',
        layout  : {
            xaxis: {type: "date"},
            yaxis: {rangemode: "nonnegative"},
            title: "Wind Speed (mph)"
        },
        traces  : [
            {obs_type: 'wind_speed'}
        ]
    },
    {
        div_root: 'outtemp-div',
        layout  : {
            xaxis: {type: "date"},
            title: "Outside Temperature (°F)"
        },
        traces  : [
            {obs_type: 'outside_temperature', label: 'Temperature'},
            {obs_type: 'dewpoint_temperature', label: 'Dewpoint'}
        ]
    },
    {
        div_root: 'radiation-div',
        layout  : {
            xaxis: {type: "date"},
            yaxis: {rangemode: "nonnegative"},
            title: "Solar Radiation (W/m²)"
        },
        traces  : [
            {obs_type: 'radiation_radiation', label: 'Radiation'}
        ]
    }
];

const recent_plot_group_spec = {
    time_group : "recent",
    measurement: "wxpackets",
    // Make a copy in case we change something. This is slow, but makes a deep copy.
    plot_list  : JSON.parse(JSON.stringify(plot_group_list))
};

const day_plot_group_spec = {
    time_group : "day",
    measurement: "wxrecords",
    // Make a copy in case we change something. This is slow, but makes a deep copy.
    plot_list  : JSON.parse(JSON.stringify(plot_group_list))
};

const weert_config = {
    obs_types    : [],  // This will get populated below
    platform     : "default_platform",
    stream       : "default_stream",
    faye_endpoint: "/api/v1/faye"
};

// Accumulate a list of observation types:
for (let plot of plot_group_list) {
    for (let trace of plot.traces) {
        weert_config.obs_types.push(trace.obs_type);
    }
}

const initial_recent_max_age = 300000;        // 5 minutes in milliseconds
const initial_day_max_age    = 27 * 3600000;  // 27 hours in milliseconds

// The tick distance for each plot length
const dticks = {
    "5" : 60000,
    "10": 60000,
    "20": 120000,
    "60": 600000
};

function readyTemplate(data_manager) {
    return new Promise(function (resolve) {
        // The DOM has to be ready before we can select the SVG area.
        $(function () {
            // Compile the console template
            let console_source   = $("#wx-console-template").html();
            let stats_source     = $("#wx-stats-template").html();
            let console_template = new Handlebars.compile(console_source);
            let stats_template   = new Handlebars.compile(stats_source);

            // Render the last packet if one is available
            let packet = data_manager.lastPacket();
            if (packet) {
                $("#wx-console-area").html(console_template(packet));
            }
            // Render the stats if they are available
            if (data_manager.stats) {
                $("#wx-stats-area").html(stats_template(data_manager.stats));
            }
            // Set the callback for new packets
            data_manager.subscribe((event_type, new_packet) => {
                if (event_type === 'new_packet') {
                    // Render the Handlebars template showing the new conditions
                    $("#wx-console-area").html(console_template(new_packet));
                }
            });
            resolve([console_template, stats_template]);
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
                                                new_packet.timestamp,
                                                new_packet.fields.wind_dir,
                                                new_packet.fields.wind_speed
                                            ]);
                }
            });

            resolve(wind_compass);
        });
    });
}

// Once we're done creating things, these will be filled out
var recent_data_manager;
var day_data_manager;
var recent_plot_group;
var day_plot_group;

// Allow changing the total time span displayed by the "recent" plots:
var changeSpan = function (x) {
    // Changing the max_age will cause new data to be downloaded.
    // Wait until it settles down before changing the tick distance.
    return recent_data_manager.setMaxAge(x.value * 60000)
                              .then(() => {
                                  return recent_plot_group.relayout({'xaxis.dtick': dticks[x.value]});
                              });
};

DataManager.createDataManager(recent_plot_group_spec.measurement,
                              Object.assign({}, weert_config, {max_age: initial_recent_max_age}))
           .then(rdmgr => {
               recent_data_manager = rdmgr;
               return Promise.all([
                                      recent_data_manager.getStats(),
                                      readyWindCompass(recent_data_manager),
                                      PlotGroup.createPlotGroup(recent_data_manager, recent_plot_group_spec)
                                  ]);
           })
           .then((results) => {
               recent_plot_group = results[2];
               recent_plot_group.relayout({'xaxis.dtick': dticks["5"]});
               return readyTemplate(recent_data_manager);
           })
           .then(() => {
               console.log("'Recent' data manager ready");

           });
DataManager.createDataManager(day_plot_group_spec.measurement,
                              Object.assign({}, weert_config, {max_age: initial_day_max_age}))
           .then(ddmgr => {
               day_data_manager = ddmgr;
               return PlotGroup.createPlotGroup(day_data_manager, day_plot_group_spec);
           })
           .then((dpg) => {
               day_plot_group = dpg;
               console.log("'Day' data manager ready");
           });

Handlebars.registerHelper("formatTimeStamp", function (ts, options) {
    let form = (!options || typeof options != 'string') ? undefined : options;
    return moment(+ts).format(form);
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
