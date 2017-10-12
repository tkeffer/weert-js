/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var weert_config = {
    platform     : "default_platform",
    stream       : "default_stream",
    faye_endpoint: "/api/v1/faye"
};

var plot_list = [
    {
        plot_div: 'windspeed-div',
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
        plot_div: 'outtemp-div',
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
        plot_div: 'radiation-div',
        layout  : {
            xaxis: {type: "date"},
            title: "Solar Radiation (W/m²)"
        },
        traces  : [
            {obs_type: 'radiation_radiation', label: 'Radiation'}
        ]
    }
];

var recent_group = {
    time_group      : "recent",
    measurement     : "wxpackets",
    max_initial_age : 600000,       // In milliseconds
    max_retained_age: 600000,       // In milliseconds
    plot_list       : plot_list
};

var day_group = {
    time_group      : "day",
    measurement     : "wxrecords",
    max_initial_age : 24 * 3600000, // In milliseconds
    max_retained_age: 27 * 3600000, // In milliseconds
    plot_list       : plot_list
};


function readyDoc() {

    return new Promise(function (resolve) {
        // The DOM has to be ready before we can select the SVG area.
        document.addEventListener("DOMContentLoaded", function () {

            // Compile the console template
            var source = $("#wx-console-template").html();
            var console_template = new Handlebars.compile(source);

            // Include the initial wind compass
            var windcompass = new WindCompass();

            resolve([console_template, windcompass]);
        });
    });
}

function getRecentData(measurement, max_initial_age) {
    // Tell the server to send up to max_initial_age_secs worth of data.
    // Convert to nanoseconds.
    var stop = Date.now() * 1000000;
    var start = stop - max_initial_age * 1000000;
    // Use a simple GET request, returning the promise
    return $.ajax({
                      url     : "http://" + window.location.host + "/api/v1/measurements/" + measurement + "/packets",
                      data    : {
                          start   : start,
                          stop    : stop,
                          platform: weert_config.platform,
                          stream  : weert_config.stream
                      },
                      method  : "GET",
                      dataType: "JSON"
                  });
}

function createPlotGroup(plot_group, packet_array) {
    var promises = [];
    for (var plot of plot_group.plot_list) {
        promises.push(createPlot(plot, plot_group.time_group + '-' + plot.plot_div, packet_array));
    }
    return Promise.all(promises);
}

function createPlot(plot, plot_div, packet_array) {

    var data = [];
    for (var trace of plot.traces) {
        data.push(
            {
                x   : packet_array.map(function (packet) {
                    return packet.timestamp / 1000000;
                }),
                y   : packet_array.map(function (packet) {
                    return packet.fields[trace.obs_type];
                }),
                mode: "lines",
                type: "scatter",
                name: trace.label
            });
    }
    return Plotly.newPlot(plot_div, data, plot.layout);
}

function extendPlotGroup(plot_group, packet) {
    var promises = [];
    var N;
    // Go through all the plots for this plot group, updating each one
    for (var plot of plot_group.plot_list) {
        var update = {
            x: plot.traces.map(function (trace) {
                return [packet.timestamp / 1000000];
            }),
            y: plot.traces.map(function (trace) {
                return [packet.fields[trace.obs_type]];
            })
        };
        // This will be a simple array [0, 1, ... J] of the same length
        // as the number of traces in this plot.
        var trace_list = [];
        for (var i = 0; i < plot.traces.length; i++) {
            trace_list.push(i);
        }

        // To get the document division name, concatenate the time group
        // with the div name for this plot
        var div_name = plot_group.time_group + '-' + plot.plot_div;

        // Find the dataset, then look for the last point to be retained.
        // If an exception occurs, then retain everything.
        try {
            var plotData = document.getElementById(div_name).data;
            var trim_time = Date.now() - plot_group.max_retained_age;
            var i = plotData[0].x.findIndex(function (xval) {
                return xval >= trim_time;
            });

            // If all data points are up to date, keep them all.
            N = i ? plotData[0].x.length - i : undefined;

        } catch (err) {
            N = undefined;
        }
        // Now extend the traces in this plot, retaining N points.
        promises.push(Plotly.extendTraces(div_name, update, trace_list, N));
    }

    // This is a promise to update all the plots in this plot group
    return Promise.all(promises);
}

// Wait until the recent data has been received and the template compiled,
// then proceed with rendering the template and plots.
Promise.all([getRecentData(recent_group.measurement,
                           recent_group.max_initial_age), readyDoc()])
       .then(function (results) {
           return new Promise(function (resolve, reject) {
               var recent_data = results[0];
               var console_template = results[1][0];
               var wind_compass = results[1][1];
               console.log("Got", recent_data.length, "records for recent group");

               var last_packet = recent_data[recent_data.length - 1];
               // Render the Handlebars template showing the current conditions
               var html = console_template(last_packet);
               $("#wx-console-area").html(html);

               // Initialize the wind compass
               wind_compass.updateWind([last_packet.timestamp / 1000000,
                                           last_packet.fields.wind_dir,
                                           last_packet.fields.wind_speed]);

               // Create the "recent" plots:
               createPlotGroup(recent_group, recent_data)
                   .then(function () {
                       resolve([console_template, wind_compass]);
                   })
                   .catch(function (err) {
                       reject(err);
                   });
           });
       })
       .then(function (results) {
           var console_template = results[0];
           var wind_compass = results[1];
           // The recent data and plots have been rendered. Time
           // to subscribe to updates
           var client = new Faye.Client("http://" + window.location.host + weert_config.faye_endpoint);
           return client.subscribe("/" + recent_group.measurement, function (packet) {
               var html = console_template(packet);
               $("#wx-console-area").html(html);

               // Update the wind compass
               wind_compass.updateWind([packet.timestamp / 1000000,
                                           packet.fields.wind_dir,
                                           packet.fields.wind_speed]);


               return extendPlotGroup(recent_group, packet);
           });
       })
       .then(() => {
           console.log(`Subscribed to POSTS to measurement ${recent_group.measurement}`);
       })
       .catch(function (err) {
           console.log(`Error creating or updating measurement ${recent_group.measurement}: ${err}`);
       });

// Now do the "day" plots. Because the template is not involved, it's much simpler.
getRecentData(day_group.measurement, day_group.max_initial_age)
    .then(function (day_data) {
        console.log("Got", day_data.length, "records for day group");
        return createPlotGroup(day_group, day_data);
    })
    .then(function () {
        var client = new Faye.Client("http://" + window.location.host + weert_config.faye_endpoint);
        return client.subscribe("/" + day_group.measurement, function (packet) {
            return extendPlotGroup(day_group, packet);
        });
    })
    .then(() => {
        console.log(`Subscribed to CQ updates to measurement ${day_group.measurement}`);
    })
    .catch(err => {
        console.log(`Error creating or updating measurement ${day_group.measurement}: ${err}`);
    });


Handlebars.registerHelper("formatTimeStamp", function (ts) {
    return new Date(ts / 1000000);
});

Handlebars.registerHelper("formatNumber", function (val, digits) {
    if (val === null || val === undefined) {
        return "N/A";
    } else {
        return val.toFixed(digits);
    }
});
