/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var weert_config = {
    measurement        : "wxpackets",
    platform           : "default_platform",
    stream             : "default_stream",
    max_initial_age    : 1200,
    max_retained_points: 512,
    faye_endpoint      : "/api/v1/faye"
};


var plots = [
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

Handlebars.registerHelper("formatTimeStamp", function (ts) {
    return new Date(ts / 1000000);
});

Handlebars.registerHelper("formatNumber", function (val, digits) {
    if (val === null | val === undefined) {
        return "N/A";
    } else {
        return val.toFixed(digits);
    }
});

function getRecentData() {
    // Tell the server to send up to max_initial_age_secs worth of data.
    var stop = Date.now() * 1000000;
    var start = stop - weert_config.max_initial_age * 1000000000;
    // Use a simple GET request, returning the promise
    return $.ajax({
        url     : "http://" + window.location.host + "/api/v1/measurements/" + weert_config.measurement + "/packets",
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


function createPlot(plot_info, packet_array) {

    var data = [];
    for (var trace of plot_info.traces) {
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
            })
        ;
    }
    var layout = {
        xaxis: {type: "date"},
        title: plot_info.title
    };
    return Plotly.newPlot(plot_info.plot_div, data, layout);
}

function extendPlot(plot_info, packet) {
    var update = {
        x: plot_info.traces.map(function (trace) {
            return [packet.timestamp / 1000000];
        }),
        y: plot_info.traces.map(function (trace) {
            return [packet.fields[trace.obs_type]];
        })
    };
    var trace_list = [];
    for (var i = 0; i < plot_info.traces.length; i++) {
        trace_list.push(i);
    }
    return Plotly.extendTraces(plot_info.plot_div, update, trace_list,
        weert_config.max_retained_points);
}


// Wait until the template and new data are ready, then proceed
Promise.all([getRecentData(), compileTemplate()])
       .then(function (results) {
           var recent_data = results[0];
           var console_template = results[1];
           // Render the Handlebars template showing the current conditions
           var html = console_template(recent_data[recent_data.length - 1]);
           $("#wx-console-area").html(html);

           var ps = [];
           // Create the plots
           for (var plot of plots) {
               ps.push(createPlot(plot, recent_data));
           }
           Promise.all(ps)
                  .then(function () {
                      console.log(ps.length, "plots created");
                  })
                  .catch(function (err) {
                      console.log("Error creating plots:", err);
                  });

           // Now subscribe to any new data points and update the console and
           // plots with them
           var client = new Faye.Client("http://" + window.location.host + weert_config.faye_endpoint);
           client.subscribe("/" + weert_config.measurement, function (packet) {
               html = console_template(packet);
               $("#wx-console-area").html(html);

               var ps = [];
               for (var plot of plots) {
                   ps.push(extendPlot(plot, packet));
               }
               Promise.all(ps)
                      .then(function () {
                          console.log(ps.length, "plots updated");
                      })
                      .catch(function (err) {
                          console.log("Error updating plots:", err);
                      });

           });
       });
