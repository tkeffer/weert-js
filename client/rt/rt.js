/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

//              CLIENT CODE
"use strict";

var measurement = 'wxpackets';
var platform = 'default_platform';
var stream = 'default_stream';

// Initial request of data from the WeeRT server in seconds
var max_initial_age_secs = 1200;
// Max retained age in seconds:
var max_age_secs = 3600;

Handlebars.registerHelper('formatTimeStamp', function (ts) {
    return new Date(ts / 1000000);
});

Handlebars.registerHelper("formatNumber", function (val, digits) {
    if (val == null) {
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
        method  : 'GET',
        dataType: 'JSON'
    });
};

function compileTemplate() {

    return new Promise(function (resolve, reject) {
        // The DOM has to be ready before we can select the SVG area.
        document.addEventListener("DOMContentLoaded", function (event) {

            // Compile the console template
            var source = $("#wx-console-template").html();
            var console_template = new Handlebars.compile(source);

            resolve(console_template);
        });
    });
};

Promise.all([getRecentData(), compileTemplate()])
       .then(results => {
           let recent_data = results[0];
           let console_template = results[1];
           // Render the Handlebars template showing the current conditions
           let html = console_template(recent_data[recent_data.length - 1]);
           $("#wx-console-area").html(html);

           // Now subscribe to any new data points and update the console with them
           var client = new Faye.Client("http://" + window.location.host + "/faye");
           client.subscribe('/' + measurement, function (packet) {
               html = console_template(packet);
               $("#wx-console-area").html(html);
           });
       });



