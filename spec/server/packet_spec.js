/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Test spec for testing the POSTing of packets to a measurement.
 */
"use strict";

import async from "async";
import frisby from "frisby";
import normalizeUrl from "normalize-url";
import request from "request";
import config from "../../server/config/config.js";

const measurements_url = "http://localhost:3000" + config.server.api + "/measurements";
const measurement_url  = measurements_url + "/test_measurement";
const packets_url      = measurement_url + "/packets";

// We have to make sure all inserted times are within the retention policy
// of the database. So, use current time stamps.
const now = Date.now();

const timestamp = function(i) {
  // Base time is an hour ago. Data points every 10 seconds.
  return now - 3600000 + i * 10000;
};

const temperature = function(i) {
  return 40 - i;
};

const form_deep_packet = function(i) {
  return {
    tags: { platform: "test_platform" },
    fields: { temperature: temperature(i) },
    timestamp: timestamp(i)
  };
};

let auth_value = "Basic " + Buffer.from("weert:weert").toString("base64");

// Make sure to add an Authorization header to all requests.
frisby.globalSetup({
                     request: {
                       headers: { "Authorization": auth_value }
                     }
                   });

let req = request.defaults({
                             headers: { "Authorization": auth_value }
                           });

describe("In the single packet tests", function() {

  // Before each test, delete the entire measurement.
  beforeEach(function(doneFn) {
    req({
          url: measurement_url,
          method: "DELETE"
        }, function(err) {
      doneFn();
    });

  });

  it("should POST and GET a single packet", function(doneFn) {
    frisby.post(packets_url, form_deep_packet(0), { json: true })
          .expect("status", 201)
          .then(function(res) {
            // We've POSTed a packet. Now try to retrieve it. Get the location
            // out of the returned header
            const packet_link = res.headers.get("location");
            // Now retrieve and check the POSTed packet
            return frisby.get(packet_link)
                         .expect("status", 200)
                         .then(function(res) {
                           expect(JSON.parse(res.body)).toEqual([form_deep_packet(0)]);
                         });
          })
          .done(doneFn);
  });

  it("should POST and DELETE a packet", function(doneFn) {
    frisby.post(packets_url, form_deep_packet(0), { json: true })
          .expect("status", 201)
          .then(function(res) {
            // We've POSTed a packet. Now try to delete it. Get the location
            // out of the returned header
            const packet_link = res.headers.get("location");
            // Check its value
            expect(packet_link).toEqual(packets_url + "/" + timestamp(0));
            // Now delete it.
            return frisby.del(packet_link)
                         .expect("status", 204)
                         .then(function(res) {
                           // Make sure it's truly deleted. This also tests getting a non-existent packet
                           return frisby.get(packet_link)
                                        .expect("status", 404);
                         });
          })
          .done(doneFn);
  });

  it("should DELETE a non-existing packet", function(doneFn) {
    let packet_url = packets_url + "/" + timestamp(0);
    // Try deleting a non-existing packet. Should also get a 204
    frisby.del(packet_url)
          .expect("status", 204)
          .done(doneFn);

  });
});

describe("Malformed packet tests", function() {

  let packet_url = packets_url + "/" + timestamp(0);
  // Before each test, delete the packet (which may or may not exist).
  beforeEach(function(doneFn) {
    req({
          url: packet_url,
          method: "DELETE"
        }, function(err) {
      doneFn();
    });

  });

  // Form a packet without a timestamp
  let no_timestamp_packet = form_deep_packet(0);
  delete no_timestamp_packet.timestamp;

  it("should not POST a packet with no timestamp", function(doneFn) {
    frisby.post(packets_url, no_timestamp_packet, { json: true })
          .expect("status", 400)
          .done(doneFn);
  });

  let bad_measurement_packet         = form_deep_packet(0);
  bad_measurement_packet.measurement = "foo";
  it("should not POST a packet with a mis-matched value of 'measurement'", function(doneFn) {
    frisby.post(packets_url, bad_measurement_packet, { json: true })
          .expect("status", 400)
          .done(doneFn);
  });

  // Try it with a good value for 'measurement'
  let good_measurement_packet         = form_deep_packet(0);
  good_measurement_packet.measurement = "test_measurement";
  it("should POST a packet with a matched value of 'measurement'", function(doneFn) {
    frisby.post(packets_url, good_measurement_packet, { json: true })
          .expect("status", 201)
          .done(doneFn);
  });

  // Test inserting a null value
  let packet_with_null             = form_deep_packet(0);
  packet_with_null.fields.humidity = null;
  it("should allow insertion of a NULL value", function(doneFn) {
    frisby.post(packets_url, packet_with_null, { json: true })
          .expect("status", 201)
          .then(function(res) {
            // We've POSTed the packet. Now retrieve it and make sure
            // the null value is not there.
            const packet_link = res.headers.get("location");
            // Retrieve and check the POSTed packet
            return frisby.get(packet_link)
                         .expect("status", 200)
                         .then(function(res) {
                           expect(JSON.parse(res.body)).toEqual([form_deep_packet(0)]);
                         });
          })
          .done(doneFn);
  });

});

// How many packets to use for the test.
// Must be > 5 for the tests to work.
const N = 10;
describe("Launch and test " + N + " POSTs of packets", function() {

  let indices         = [];
  let packets         = [];
  let reverse_packets = [];
  for (let i = 0; i < N; i++) {
    indices[i]                 = i;
    packets[i]                 = form_deep_packet(i);
    reverse_packets[N - i - 1] = packets[i];
  }

  // This function will return the URI for the specific packet at a given timestamp
  const time_link = function(timestamp) {
    return normalizeUrl(packets_url + "/" + timestamp);
  };

  let results_finished   = false;
  let results_successful = false;

  // Before any of the tests, first delete the measurement, then repopulate it
  beforeAll(function(doneFn) {

    req({
          url: measurement_url,
          method: "DELETE"
        }, function(err) {
      // Now asynchronously repopulate it.
      async.each(indices, function(i, callback) {
        req({
              url: packets_url,
              method: "POST",
              body: packets[i],
              json: true
            }, function(error) {
          return callback(error);
        });
      }, function(err) {
        // This function is called when finished. Signal that we're finished, and whether
        // there were any errors
        results_successful = !err;
        doneFn();
      });
    });
  });

  it("should have create " + N + " packets", function(doneFn) {
    expect(results_successful).toBeTruthy();
    doneFn();
  });

  it("should retrieve all packets in default order", function(doneFn) {
    frisby.get(packets_url)
          .expect("status", 200)
          .then(function(res) {
            // Could not get the Frisby test for JSON to work, so use this:
            expect(JSON.parse(res.body)).toEqual(packets);
          })
          .done(doneFn);
  });

  it("should retrieve all packets in reverse order", function(doneFn) {
    frisby.get(packets_url + "?direction=desc")
          .expect("status", 200)
          .then(function(res) {
            expect(JSON.parse(res.body)).toEqual(reverse_packets);
          })
          .done(doneFn);
  });

  it("should fail with bad sort order", function(doneFn) {
    frisby.get(packets_url + "?direction=foo")
          .expect("status", 400)
          .done(doneFn);
  });

  it("should return packets after a given time", function(doneFn) {
    frisby.get(packets_url + "?start=" + timestamp(2))
          .expect("status", 200)
          .then(function(res) {
            expect(JSON.parse(res.body)).toEqual(packets.slice(3, N + 1));
          })
          .done(doneFn);
  });

  it("should return packets before or equal to a given time", function(doneFn) {
    frisby.get(packets_url + "?stop=" + timestamp(5))
          .expect("status", 200)
          .then(function(res) {
            expect(JSON.parse(res.body)).toEqual(packets.slice(0, 6));
          })
          .done(doneFn);
  });

  it("should return up to 3 packets before or equal to a given time", function(doneFn) {
    frisby.get(packets_url + "?limit=3&stop=" + timestamp(5))
          .expect("status", 200)
          .then(function(res) {
            expect(JSON.parse(res.body)).toEqual(packets.slice(0, 3));
          })
          .done(doneFn);
  });

  it("should return a single timestamp", function(doneFn) {
    frisby.get(packets_url + "/" + timestamp(3))
          .expect("status", 200)
          .then(function(res) {
            expect(JSON.parse(res.body)).toEqual([packets[3]]);
          })
          .done(doneFn);
  });

  it("should return a single timestamp on a specific platform", function(doneFn) {
    frisby.get(packets_url + "/" + timestamp(3) + "?platform=test_platform")
          .expect("status", 200)
          .then(function(res) {
            expect(JSON.parse(res.body)).toEqual([packets[3]]);
          })
          .done(doneFn);
  });
});

describe("Testing measurement", function() {

  // Before each test, delete the packet (which may or may not exist).
  beforeEach(function(doneFn) {
    req({
          url: packets_url,
          method: "POST",
          json: true,
          body: form_deep_packet(0)
        }, function(error) {
      return doneFn();
    });
  });

  it("should return metadata about a measurement", function(doneFn) {
    frisby.get(measurement_url)
          .expect("status", 200)
          .then(function(res) {
            expect(JSON.parse(res.body)).toEqual([{ platform: "test_platform" }]);
          })
          .done(doneFn);
  });
  it("should delete a measurement", function(doneFn) {
    frisby.del(measurement_url)
          .expect("status", 204)
          .then(function() {
            frisby.get(measurement_url)
                  .expect("status", 404);
          })
          .done(doneFn);
  });
});