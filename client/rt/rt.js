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
    return new Date(ts);
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

    return new Promise(function(resolve, reject){
        // The DOM has to be ready before we can select the SVG area.
        document.addEventListener("DOMContentLoaded", function (event) {

            // Compile the console template
            var source = $("#wx-console-template").html();
            var console_template = new Handlebars.compile(source);

            resolve(console_template);
        });
    })
};

Promise.all([getRecentData(), compileTemplate()])
    .then(results =>{
        let recent_data = results[0];
        console.log("recent data=", results[0])
        let console_template = results[1];
        // Render the Handlebars template showing the current conditions
        let html = console_template(recent_data[0])
        $("#wx-console-area").html(html);
    })

// We can get the initial data while we get the plot ready, but both have to be done
// before we can actually update the plot:
// async.parallel([getRecentData, compileTemplate], updatePlot);
// getRecentData(function () {
// });
// compileTemplate(function () {
// });
//
// // Now render it as a place holder until the first update:
// var html = console_template({});
// $("#wx-console-area").html(html);

// var updatePlot = function (err) {
//     if (err) throw err;
//
//     charts.data(dataset);
//     charts.render();
//
//     // web socket event channel for new posts for this streamName:
//     var subscription_name = 'NEW_LOOP_PACKET';
//
//     socket.on(subscription_name, function (msg) {
//         // Check to see if it's our stream
//         if (msg.stream === streamName){
//             var packet = msg.packet;
//             console.log("Client got packet", new Date(packet.timestamp));
//             dataset.push(packet);
//             // Trim any too-old packets
//             var now = Date.now();
//             while (dataset[0].timestamp < (now - max_age_secs * 1000)) {
//                 dataset.shift();
//             }
//
//             // Because Handlebars will overwrite the wind compass, we need to
//             // first detach it, save it, then reattach later
//             var hold = $("#windCompass").detach();
//             // Render the Handlebars template showing the current conditions
//             var html = console_template(packet);
//             $("#wx-console-area").html(html);
//             // Now reattach the wind compass
//             $("#windCompass").html(hold);
//
//             // Update the wind compass
//             windcompass.updateWind([packet.timestamp, packet.wind_direction, packet.wind_speed]);
//
//             // Update the line charts
//             charts.render();
//         }
//     });
// };

