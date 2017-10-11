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
        title   : "Wind Speed (mph)",
        traces  : [
            {obs_type: 'wind_speed'}
        ]
    },
    {
        plot_div: 'outtemp-div',
        title   : "Outside Temperature (°F)",
        traces  : [
            {obs_type: 'outside_temperature', label: 'Temperature'},
            {obs_type: 'dewpoint_temperature', label: 'Dewpoint'}
        ]
    },
    {
        plot_div: 'heatchill-div',
        title   : "Wind Chill / Heat Index (°F)",
        traces  : [
            {obs_type: 'windchill_temperature', label: 'Wind Chill'},
            {obs_type: 'heatindex_temperature', label: 'Heat Index'}
        ]
    }
];

var recent_group = {
    time_group         : "recent",
    measurement        : "wxpackets",
    max_initial_age    : 600000,
    max_retained_points: 512,
    plot_list          : plot_list
};

var day_group = {
    time_group         : "day",
    measurement        : "wxrecords",
    max_initial_age    : 24 * 3600000,
    max_retained_points: 512,
    plot_list          : plot_list
};


function compileTemplate() {

    return new Promise(function (resolve) {
        // The DOM has to be ready before we can select the SVG area.
        document.addEventListener("DOMContentLoaded", function () {

            // Compile the console template
            var source = $("#wx-console-template").html();
            var console_template = new Handlebars.compile(source);

            resolve(console_template);
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
    var layout = {
        xaxis: {type: "date"},
        title: plot.title
    };
    return Plotly.newPlot(plot_div, data, layout);
}

function extendPlotGroup(plot_group, packet) {
    var promises = [];
    for (var plot of plot_group.plot_list) {
        var update = {
            x: plot.traces.map(function (trace) {
                return [packet.timestamp / 1000000];
            }),
            y: plot.traces.map(function (trace) {
                return [packet.fields[trace.obs_type]];
            })
        };
        var trace_list = [];
        for (var i = 0; i < plot.traces.length; i++) {
            trace_list.push(i);
        }
        var div_name = plot_group.time_group + '-' + plot.plot_div;

        promises.push(Plotly.extendTraces(div_name, update, trace_list,
                                          plot_group.max_retained_points));
    }
    return Promise.all(promises);
}

// Wait until the recent data has been received and the template compiled,
// then proceed with rendering the template and plots.
Promise.all([getRecentData(recent_group.measurement,
                           recent_group.max_initial_age), compileTemplate()])
       .then(function (results) {
           return new Promise(function (resolve, reject) {
               var recent_data = results[0];
               var console_template = results[1];
               // Render the Handlebars template showing the current conditions
               var html = console_template(recent_data[recent_data.length - 1]);
               $("#wx-console-area").html(html);

               // Create the "recent" plots:
               createPlotGroup(recent_group, recent_data)
                   .then(function () {
                       resolve(console_template);
                   })
                   .catch(function (err) {
                       reject(err);
                   });
           });
       })
       .then(function (console_template) {
           // The recent data and plots have been rendered. Time
           // to subscribe to updates
           var client = new Faye.Client("http://" + window.location.host + weert_config.faye_endpoint);
           client.subscribe("/" + recent_group.measurement, function (packet) {
               var html = console_template(packet);
               $("#wx-console-area").html(html);

               return extendPlotGroup(recent_group, packet);
           });
       })
       .catch(function (err) {
           console.log("Error creating or updating recent values", err);
       });

// Now do the "day" plots
getRecentData(day_group.measurement, day_group.max_initial_age)
    .then(function (day_data) {
        return createPlotGroup(day_group, day_data);
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
