/*
 * Copyright (c) 2015-2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Test spec for testing the POSTing of packets to a stream.
 */
"use strict";

var async = require('async');
var frisby = require('frisby');
var normalizeUrl = require('normalize-url');
var request = require('request');

var config = require('../config');

var test_url = 'http://localhost:3000' + config.server.api + '/measurements';

var timestamp = function (i) {
    // Base time is 1-Jan-2015 0000 UTC:
    return 1420070400000 + i * 300000;
};

var temperature = function (i) {
    return 40 - i;
};

var form_deep_packet = function (i) {
    let obj = {
        timestamp: String(timestamp(i)),
        tags: {platform: 'test_platform'},
        fields: {temperature: temperature(i)}
    };
    return obj;
};

var testSinglePacket = function () {

    // POST a single packet
    frisby
        .create("POST a single packet")
        .post(test_url + '/test_measurement/packets',
            form_deep_packet(0),
            {json: true}
        )
        .expectStatus(201)
        .after(function (error, res) {
            // We've POSTed a packet. Now try to retrieve it. Get the location
            // out of the returned header
            var packet_link = res.headers.location;
            frisby.create("GET a single packet")
                .get(packet_link)
                .expectStatus(200)
                .expectHeaderContains('content-type', 'application/json')
                .expectJSON('', form_deep_packet(0))
                .after(function (err, res, body) {
                    // We've retrieved it. Now delete it.
                    frisby.create("DELETE a single packet")
                        .delete(packet_link)
                        .expectStatus(204)
                        .after(function () {
                            // Now make sure it is really deleted.
                            frisby.create("Get a non-existent packet")
                                .get(packet_link)
                                .expectStatus(404)
                                .toss();
                            // Try deleting a non-existing packet. Should also get a 204
                            frisby.create("DELETE a non-existing packet")
                                .delete(packet_link)
                                .expectStatus(204)
                                .toss();
                        })
                        .toss();
                })
                .toss();
        })
        .toss();

    let no_timestamp_packet = form_deep_packet(0);
    delete no_timestamp_packet.timestamp;
    frisby
        .create("Post a packet with no timestamp")
        .post(test_url + '/test_measurement/packets',
            no_timestamp_packet,
            {json: true}
        )
        .expectStatus(400)
        .toss();

    let bad_measurement_packet = form_deep_packet(0);
    bad_measurement_packet.measurement = 'foo';
    frisby
        .create("Post a packet with a mis-matched value of 'measurement'")
        .post(test_url + '/test_measurement/packets',
            bad_measurement_packet,
            {json: true}
        )
        .expectStatus(400)
        .toss();

    // Try it with a good value for 'measurement'
    let good_measurement_packet = form_deep_packet(0);
    good_measurement_packet.measurement = 'test_measurement';
    frisby
        .create("Post a packet with a matched value of 'measurement'")
        .post(test_url + '/test_measurement/packets',
            good_measurement_packet,
            {json: true}
        )
        .expectStatus(201)
        .toss();
};

// var testMiscellaneous = function () {
//
//     frisby
//         .create("Get a single packet from a non-existent stream")
//         .get(test_url + "/56a9962066c7ea36598cd4c3/packets/latest")
//         .expectStatus(404)
//         .toss();
//
//     frisby
//         .create("Retrieve all packets from a non-existent stream")
//         .get(test_url + "/56a9962066c7ea36598cd4c3/packets")
//         .expectStatus(404)
//         .toss();
//
//     frisby
//         .create("POST to a non-existent stream")
//         .post(test_url + "/56accd7718b4e21640adf305/packets",
//             {
//                 timestamp: timestamp(0),
//                 outside_temperature: temperature(0)
//             },
//             {json: true}
//         )
//         .expectStatus(404)
//         .toss();
// };
//
//
// var testMultiplePackets = function () {
//     // How many packets to use for the test.
//     // Must be > 5 for the tests to work.
//     var N = 20;
//     var query;
//
//     var indices = [];
//     var packets = [];
//     var reverse_packets = [];
//     for (var i = 0; i < N; i++) {
//         indices[i] = i;
//         packets[i] = {
//             timestamp: timestamp(i),
//             outside_temperature: temperature(i)
//         };
//         reverse_packets[N - i - 1] = packets[i];
//     }
//
//
//     frisby.create('Create a WeeRT stream to test packet retrieval')
//         .post(test_url,
//             {
//                 _id: testName + "Test packet retrieval",
//                 description: "Stream created to test the retrieval of multiple packets",
//                 unit_group: "METRIC"
//             },
//             {json: true}
//         )
//         .expectStatus(201)
//         .expectHeaderContains('content-type', 'application/json')
//         .after(function (error, res) {
//
//             // Get the URI for the just created stream resource
//             var stream_link = res.headers.location;
//             // Use it to form the URI for the packets resource
//             var stream_packet_link = normalizeUrl(stream_link + '/packets');
//             // This function will return the URI for the specific packet at a given timestamp
//             var time_link = function (timestamp) {
//                 return normalizeUrl(stream_packet_link + '/' + timestamp);
//             };
//
//             // Now launch the POSTs to create all the packets
//             // Use raw Jasmine for this.
//             describe("Launch and test " + N + " POSTs of packets", function () {
//                 var results_finished = false;
//                 var results_successful = false;
//
//                 it("should launch all POSTS", function () {
//
//                     runs(function () {
//
//                         // Use the async library to asynchronously launch the N posts
//                         async.each(indices, function (i, callback) {
//                             request({
//                                 url: stream_packet_link,
//                                 method: 'POST',
//                                 json: packets[i]
//                             }, function (error) {
//                                 return callback(error);
//                             });
//                         }, function (err) {
//                             // This function is called when finished. Signal that we're finished, and whether
//                             // there were any errors
//                             results_finished = true;
//                             results_successful = !err;
//                         });
//
//                     });
//
//                     // This function will spin until its callback return true. Then the thread of control
//                     // proceeds to the next run statement
//                     waitsFor(function () {
//                         return results_finished;
//                     }, "results to be finished", 2000);
//
//                     // All the async POSTs are done. We can test the results.
//                     runs(function () {
//                         expect(results_successful).toBeTruthy();
//
//                         frisby.create("Retrieve all packets in default order")
//                             .get(stream_packet_link)
//                             .expectStatus(200)
//                             .expectJSONTypes('', Array)
//                             .expectJSON('', packets)
//                             .toss();
//
//                         frisby.create("Retrieve all packets in reverse order")
//                             .get(stream_packet_link + '?direction=desc')
//                             .expectStatus(200)
//                             .expectJSONTypes('', Array)
//                             .expectJSON('', reverse_packets)
//                             .toss();
//
//                         frisby.create("Retrieve packets sorted by temperature")
//                             .get(stream_packet_link + '?sort=outside_temperature&direction=asc')
//                             .expectStatus(200)
//                             .expectJSONTypes('', Array)
//                             .expectJSON('', reverse_packets)
//                             .toss();
//
//                         frisby.create("Retrieve packets reverse sorted by temperature")
//                             .get(stream_packet_link + '?sort=outside_temperature&direction=desc')
//                             .expectStatus(200)
//                             .expectJSONTypes('', Array)
//                             .expectJSON('', packets)
//                             .toss();
//
//                         frisby.create("Test packets using bad sort direction")
//                             .get(stream_packet_link + '?direction=foo')
//                             .expectStatus(400)
//                             .toss();
//
//                         frisby.create("Get aggregate_type max")
//                             .get(stream_packet_link + '?aggregate_type=max&obs_type=outside_temperature')
//                             .expectStatus(200)
//                             .afterJSON(function (json) {
//                                 expect(json).toEqual(temperature(0));
//                             })
//                             .toss();
//
//                         frisby.create("Get agg_type min value")
//                             .get(stream_packet_link + '?agg_type=min&obs_type=outside_temperature')
//                             .expectStatus(200)
//                             .afterJSON(function (json) {
//                                 expect(json).toEqual(temperature(N - 1));
//                             })
//                             .toss();
//
//                         frisby.create("Get min value of a bogus observation type")
//                             .get(stream_packet_link + '?agg_type=min&obs_type=bogus_temperature')
//                             .expectStatus(200)
//                             .afterJSON(function (json) {
//                                 expect(json).toEqual(null);
//                             })
//                             .toss();
//
//                         // Test a query. Select only packets where temperature <= the temperature in record 5. Because
//                         // temperatures descend with time, this will exclude the first 5 records.
//                         // So, there should be N-5 left.
//                         query = '&query=' + encodeURIComponent(JSON.stringify({outside_temperature: {$lte: temperature(5)}}));
//                         frisby.create("Get packets by value with query")
//                             .get(stream_packet_link + '?as=values&' + query)
//                             .expectStatus(200)
//                             .afterJSON(function (json) {
//                                 expect(json).toEqual(packets.slice(5));     // Exclude first 5 records
//                             })
//                             .toss();
//
//                         // Test adding an arbitrary query to the aggregation. In this case, look for the min
//                         // temperature in the records restricted to those with temperature >= the temperature
//                         // in the N-3 record. Because temperatures are descending with time, this should be
//                         // the temperature of the N-3 record
//                         query = '&query=' + encodeURIComponent(JSON.stringify({outside_temperature: {$gte: temperature(N - 3)}}));
//                         frisby.create("Get aggregate with query")
//                             .get(stream_packet_link + '?agg_type=min&obs_type=outside_temperature' + query)
//                             .expectStatus(200)
//                             .afterJSON(function (json) {
//                                 expect(json).toEqual(temperature(N - 3));
//                             })
//                             .toss();
//
//                         frisby.create("Search for last packet")
//                             .get(time_link('latest'))
//                             .expectStatus(200)
//                             .expectJSON('', packets[N - 1])
//                             .after(function (error, res) {
//                                 describe("Test that search for last packet", function () {
//                                     it("contains the packet link", function () {
//                                         expect(res.headers.location).toEqual(time_link(timestamp(N - 1)));
//                                     });
//                                 });
//                             })
//                             .toss();
//
//                         frisby.create("Search for default match of a timestamp, which is exact")
//                             .get(time_link(packets[2].timestamp))
//                             .expectStatus(200)
//                             .expectJSON('', packets[2])
//                             .toss();
//
//                         frisby.create("Search for an explicit exact match")
//                             .get(time_link(packets[2].timestamp) + '?match=exact')
//                             .expectStatus(200)
//                             .expectJSON('', packets[2])
//                             .toss();
//
//                         frisby.create("Search for an exact match of a non-existing timestamp")
//                             .get(time_link(packets[2].timestamp - 1) + '?match=exact')
//                             .expectStatus(404)
//                             .toss();
//
//                         frisby.create("Search for lastBefore a timestamp")
//                             .get(time_link(packets[2].timestamp - 1) + '?match=lastBefore')
//                             .expectStatus(200)
//                             .expectJSON('', packets[1])
//                             .after(function (error, res) {
//                                 describe("Test that search for lastBefore packet", function () {
//                                     it("contains the packet link", function () {
//                                         expect(res.headers.location).toEqual(time_link(timestamp(1)));
//                                     });
//                                 });
//                             })
//                             .toss();
//
//                         frisby.create("Search for firstAfter a timestamp")
//                             .get(time_link(packets[2].timestamp + 1) + '?match=firstAfter')
//                             .expectStatus(200)
//                             .expectJSON('', packets[3])
//                             .toss();
//
//                         frisby.create("Search for a location using a bad match")
//                             .get(time_link(packets[2].timestamp) + '?match=foo')
//                             .expectStatus(400)
//                             .toss();
//                     });
//                 });
//             });
//         })
//         .toss();
// };

testSinglePacket();
// testMiscellaneous();
// testMultiplePackets();
