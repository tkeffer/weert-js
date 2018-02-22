/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

"use strict";

const async  = require('async');
const config = require('../../server/config/config');

const Influx = require('influx');
const influx = new Influx.InfluxDB(config.influxdb);

const MeasurementManager = require('../../server/services/measurement_manager');
const subsampling        = require('../../server/services/subsampling');

// Null measurement config needed for these tests.
const measurement_config = {};

// Simplified obs_types, in lieu of the real one.
const obs_types = [
    {
        obs_type : "out_temperature",
        subsample: "MEAN(out_temperature)",
        stats    : ["min", "max"],
    },
];

// The name of the measurement to be used for the testing packets.
const test_packet_measurement = 'test_packets';
// The name of the measurement resulting from the subsampling.
const test_record_measurement = 'test_records';
// We will be using two platforms.
const platform1               = 'test_platform1';
const platform2               = 'test_platform2';

// Use a different temperature profile for each platform
const base_temperature = (platform => {
    return platform === platform1 ? 10.0 : 20.0;
});

// The period of the test temperature wave in milliseconds.
const period          = 3600000;
// How long between loop packets in milliseconds.
const loop_interval   = 10000.0;
// The subsampled archive interval in milliseconds.
const record_interval = 300000;
const nPackets        = period / loop_interval + 1;
const nRecords        = period / record_interval;
const start           = 1517443200000;       // = 1-Feb-2018 0000 UTC

// We need to be explicit about the subsampling policy.
const ss_policies = [
    {
        interval   : record_interval,
        source     : test_packet_measurement,
        destination: test_record_measurement,
        // This allows one to specify a generalized subsampling policy, but we
        //  will just use the subsampling specified in obs_types.
        strategy   : obs_types,
    },
];

// How many async requests to have outstanding at a time.
const concurrency = nPackets / 4 + 1;

function timestamp(i) {
    return start + loop_interval * i;
}

function temperature(t, baseVal) {
    return Math.sin(2.0 * Math.PI * t / period) + baseVal;
};

function form_deep_packet(t, platform) {
    const obj = {
        tags     : {
            platform: platform,
        },
        fields   : {
            out_temperature: temperature(t, base_temperature(platform)),
            unit_system    : 16,
        },
        timestamp: t,
    };
    return obj;
};

function populate_db(measurement_manager, platform) {
    return new Promise(function (resolve) {
        let q = async.queue((timestamp, done) => {
            const packet = form_deep_packet(timestamp, platform);
            measurement_manager.insert_packet(test_packet_measurement, packet)
                               .then(() => done());
        }, concurrency);

        for (let i = 0; i < nPackets; i++) {
            q.push(timestamp(i));
        }
        q.drain = () => resolve(nPackets);
    });
}

describe('Check subsampling', function () {
    const measurement_manager = new MeasurementManager(influx, measurement_config);

    beforeAll(function (done) {
        // Delete any existing data first
        measurement_manager.delete_measurement(test_packet_measurement)
                           .then(() => {
                               Promise.all([
                                               populate_db(measurement_manager, platform1),
                                               populate_db(measurement_manager, platform2),
                                           ])
                                      .then(() => done());
                           });
    });

    it('should have populated', function () {
        measurement_manager.find_packets(test_packet_measurement, {platform: platform1})
                           .then(packets => {
                               expect(packets.length).toEqual(nPackets);
                               return measurement_manager.find_packets(test_packet_measurement, {platform: platform2});
                           })
                           .then(packets => {
                               expect(packets.length).toEqual(nPackets);
                           });
    });

    it('should subsample', function (done) {
        const options = {
            ...ss_policies[0],
            end_ts: timestamp(nPackets - 1),
        };
        subsampling.subsample(measurement_manager, options)
                   .then((N_array) => {
                       const [N1, N2] = N_array;
                       expect(N1).toEqual(nRecords);
                       expect(N2).toEqual(nRecords);
                       done();
                   });
    });


});