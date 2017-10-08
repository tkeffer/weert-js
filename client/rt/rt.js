/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var measurement = "wxpackets";
var platform = "default_platform";
var stream = "default_stream";
var faye_endpoint = "/api/v1/faye";

//Initial request of data from the WeeRT server in seconds
var max_initial_age_secs = 1200;
//Max retained age in seconds:
var max_age_secs = 3600;

Handlebars.registerHelper("formatTimeStamp", function (ts) {
    return new Date(ts / 1000000);
});

Handlebars.registerHelper("formatNumber", function (val, digits) {
    if (val === null) {
        return "N/A";
    } else {
        return val.toFixed(digits);
    }
});

function getRecentData() {
    // Tell the server to send up to max_initial_age_secs worth of data.
    var stop = Date.now() * 1000000;
    var start = stop - max_initial_age_secs * 1000000000;
    // Use a simple GET request, returning the promise
    return $.ajax({
        url     : "http://" + window.location.host + "/api/v1/measurements/" + measurement + "/packets",
        data    : {start: start, stop: stop},
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


function obsPlot(plot_div, packet_array, obs_type) {

    var data = {
        x   : packet_array.map(function (packet) {
            return packet.timestamp / 1000000;
        }),
        y   : packet_array.map(function (packet) {
            return packet.fields[obs_type];
        }),
        mode: "lines",
        type: "scatter"
    };
    var layout = {
        xaxis: {type: "date"},
        title: obs_type
    };
    Plotly.newPlot(plot_div, [data], layout);
}

function extendPlot(plot_div, packet, obs_type) {
    var update = {
        x: [[packet.timestamp / 1000000]],
        y: [[packet.fields[obs_type]]]
    };
    Plotly.extendTraces(plot_div, update, [0]);
}

// Wait until the template and new data are ready, then proceed
Promise.all([getRecentData(), compileTemplate()])
       .then(function (results) {
           var recent_data = results[0];
           var console_template = results[1];
           // Render the Handlebars template showing the current conditions
           var html = console_template(recent_data[recent_data.length - 1]);
           $("#wx-console-area").html(html);

           // Run the plots
           obsPlot("plot-area", recent_data, "wind_speed");

           // Now subscribe to any new data points and update the console and
           // plots with them
           var client = new Faye.Client("http://" + window.location.host + faye_endpoint);
           client.subscribe("/" + measurement, function (packet) {
               html = console_template(packet);
               $("#wx-console-area").html(html);

               extendPlot("plot-area", packet, "wind_speed");
           });
       });

