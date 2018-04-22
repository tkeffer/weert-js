/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

"use strict";

const async = require('async');
const _     = require('lodash');

const event_emitter      = require('../../server/services/event_emitter');
const config             = require('../../server/config/config');
const stats_policies     = require('../../server/config/stats_policies');
const MeasurementManager = require('../../server/services/measurement_manager');
const subsampling        = require('../../server/services/subsampling');

const Influx = require('influx');
const influx = new Influx.InfluxDB(config.influxdb);

// Null measurement config needed for these tests.
const measurement_config = {};

// The name of the measurement to be used for the testing packets.
const test_packet_measurement = 'test_packets';
// The name of the measurement resulting from the subsampling.
const test_record_measurement = 'test_records';

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
        aggregates : {
            'out_temperature': 'MEAN(out_temperature)',
            'unit_system'    : 'LAST(unit_system)',
            'wind_dir'       : fields => {
                const {x_wind_speed, y_wind_speed} = fields;
                if (x_wind_speed == null || y_wind_speed == null) {
                    return null;
                }
                let d = 90.0 - (180 / Math.PI) * (Math.atan2(y_wind_speed, x_wind_speed));
                if (d < 0) d += 360.0;
                return d;
            },
            'wind_speed'     : 'MEAN(wind_speed)',
            'windgust_speed' : 'MAX(wind_speed)',
            'x_wind_speed'   : 'MEAN(x_wind_speed)',
            'y_wind_speed'   : 'MEAN(y_wind_speed)',
        },
    },
];

// How many async requests to have outstanding at a time.
const concurrency = nPackets / 4 + 1;

function timestamp(i) {
    return start + loop_interval * i;
}

function toRadians(d) {return d * Math.PI / 180;}

function toDegrees(r) {return r * 180 / Math.PI;}

// Arbitrary values added to the packet fields, to differentiate the two platforms
const baseValues = {
    'platform1': 0,
    'platform2': 5,
};

// Made up functions for the data. The platform number is just added to the returned
// value, to allow the data for each series to be unique.
function form_fields(t, platform) {
    const fields           = {
        out_temperature: (() => Math.sin(2.0 * Math.PI * (t - start) / period) + baseValues[platform])(),
        wind_speed     : (() => Math.cos(2.0 * Math.PI * (t - start) / period) + 1.0 + baseValues[platform])(),
        wind_dir       : (() => (360.0 * (t - start) / period + toDegrees(baseValues[platform])) % 360.0)(),
        unit_system    : 16,
    };
    fields['x_wind_speed'] = fields.wind_speed * Math.cos(toRadians(90.0 - fields.wind_dir));
    fields['y_wind_speed'] = fields.wind_speed * Math.sin(toRadians(90.0 - fields.wind_dir));
    return fields;
}

function form_deep_packet(t, platform) {

    const obj = {
        tags     : {
            platform: platform,
        },
        fields   : form_fields(t, platform),
        timestamp: t,
    };
    return obj;
};

function expected_packets(platform) {
    return _.range(nPackets)
            .map((i) => {
                return form_deep_packet(timestamp(i), platform);
            });
}

/**
 * Updates a running summary with a packet
 * @param {object} summary - The running summary
 * @param {object} packet - A new packet. It's mins, maxes, etc., will be merged into the summary
 * @returns {object} - The merged (reduced) summary.
 */
function summary_reducer(summary, packet) {
    const {fields} = packet;
    for (let obsType of Object.keys(fields)) {
        // If we have not seen this type before,
        // initialize the summary with this type
        if (summary[obsType] == null) {
            summary[obsType] = {sum: 0.0, count: 0, max: null, min: null, maxtime: null, mintime: null};
        }
        if (fields[obsType] != null) {
            summary[obsType].sum += fields[obsType];
            summary[obsType].count += 1;
            if (summary[obsType].max == null || fields[obsType] > summary[obsType].max) {
                summary[obsType].max     = fields[obsType];
                summary[obsType].maxtime = packet.timestamp;
                if (obsType === 'wind_speed') {
                    summary[obsType].dir = packet.fields.wind_dir;
                }
            }
            if (summary[obsType].min == null || fields[obsType] < summary[obsType].min) {
                summary[obsType].min     = fields[obsType];
                summary[obsType].mintime = packet.timestamp;
            }
        }
    }
    return summary;
};

function expected_records(packet_array, platform) {
    let records = [];

    return _.range(start, start + period, record_interval)
            .map(start_of_interval => {
                const end_of_interval = start_of_interval + record_interval;

                const summary = packet_array.filter(packet => {
                                                // Include only packets in this time interval
                                                return packet.timestamp > start_of_interval && packet.timestamp <= end_of_interval;
                                            })
                                            .reduce(summary_reducer, {});
                let record    = {
                    tags     : {
                        platform: platform,
                    },
                    fields   : {
                        out_temperature: summary.out_temperature.count ?
                            summary.out_temperature.sum / summary.out_temperature.count : null,
                        wind_speed     : summary.wind_speed.count ?
                            summary.wind_speed.sum / summary.wind_speed.count : null,
                        windgust_speed : summary.wind_speed.max,
                        x_wind_speed   : summary.x_wind_speed.count ?
                            summary.x_wind_speed.sum / summary.x_wind_speed.count : null,
                        y_wind_speed   : summary.y_wind_speed.count ?
                            summary.y_wind_speed.sum / summary.y_wind_speed.count : null,
                        unit_system    : 16,
                    },
                    timestamp: end_of_interval,
                };

                record.fields.wind_dir = 90.0 - toDegrees(Math.atan2(record.fields.y_wind_speed,
                                                                     record.fields.x_wind_speed));
                if (record.fields.wind_dir < 0) record.fields.wind_dir += 360;
                return record;
            });
}

const packet_array1 = expected_packets('platform1');
const packet_array2 = expected_packets('platform2');
const record_array1 = expected_records(packet_array1, 'platform1');
const record_array2 = expected_records(packet_array2, 'platform2');

const packet_array1_summary = packet_array1.reduce(summary_reducer, {});
const record_array1_summary = record_array1.reduce(summary_reducer, {});

function populate_db(measurement_manager, packet_array) {
    let N = 0;
    return new Promise(function (resolve) {
        let q = async.queue((packet, done) => {
            measurement_manager.insert_packet(test_packet_measurement, packet)
                               .then(() => {
                                   N += 1;
                                   done();
                               });
        }, concurrency);

        for (let packet of packet_array) {
            q.push(packet);
        }
        q.drain = () => resolve(N);
    });
}

describe('While checking subsampling', function () {
    const measurement_manager = new MeasurementManager(influx, measurement_config);

    beforeAll(function (done) {
        // Delete any existing data first
        measurement_manager.delete_measurement(test_packet_measurement)
                           .then(() => {
                               return measurement_manager.delete_measurement(test_record_measurement);
                           })
                           .then(() => {
                               // Now repopulate, using two platforms
                               Promise.all([
                                               populate_db(measurement_manager, packet_array1),
                                               populate_db(measurement_manager, packet_array2),
                                           ])
                                      .then(() => done());
                           });
    });

    // Double-check that the database got populated as we expected.
    it('should have populated', function (done) {
        measurement_manager.find_packets(test_packet_measurement, {platform: 'platform1'})
                           .then(packets => {
                               expect(packets.length).toEqual(nPackets);
                               return measurement_manager.find_packets(test_packet_measurement,
                                                                       {platform: 'platform2'});
                           })
                           .then(packets => {
                               expect(packets.length).toEqual(nPackets);
                               done();
                           });
    });

    it('should subsample', function (done) {

        const seen_records = {
            platform1: [],
            platform2: [],
        };

        // Listen for the NEW_AGGREGATION events being emitted from the subsampler,
        // so we can test them as well.
        event_emitter.on('NEW_AGGREGATE', (record, measurement) => {
            if (!_.isEmpty(record)) {
                expect(measurement).toEqual(test_record_measurement);
                seen_records[record.tags.platform].push(record);
            }
        });

        const options = {
            ...ss_policies[0],
            end_ts: timestamp(nPackets - 1),
        };

        subsampling.subsample(measurement_manager, options)
                   .then((N_array) => {
                       const [N1, N2] = N_array;
                       expect(N1).toEqual(nRecords);
                       expect(N2).toEqual(nRecords);
                   })
                   .then(() => {
                       measurement_manager.find_packets(test_record_measurement, {platform: 'platform1'})
                                          .then(records => {
                                              check_records(records, record_array1);
                                              // The "seen" array may be in a random order. Sort before comparing
                                              seen_records.platform1.sort(
                                                  (left, right) => left.timestamp - right.timestamp);
                                              check_records(seen_records.platform1, record_array1);
                                              return measurement_manager.find_packets(test_record_measurement,
                                                                                      {platform: 'platform2'});
                                          })
                                          .then(records => {
                                              check_records(records, record_array2);
                                              // The "seen" array may be in a random order. Sort before comparing
                                              seen_records.platform2.sort(
                                                  (left, right) => left.timestamp - right.timestamp);
                                              check_records(seen_records.platform2, record_array2);
                                          });
                       done();
                   });
    });

    it('should calculate stats', function (done) {
        const options = {
            platform: 'platform1',
            now     : start,
        };
        measurement_manager.run_stats(test_record_measurement, stats_policies, options)
                           .then(results => {
                               for (let obsType of ['out_temperature', 'wind_speed', 'windgust_speed', 'unit_system']) {
                                   if (obsType !== 'windgust_speed') {
                                       expect(results[obsType].min.value)
                                           .toEqual(record_array1_summary[obsType].min);
                                       expect(results[obsType].min.timestamp)
                                           .toEqual(record_array1_summary[obsType].mintime);
                                   }
                                   expect(results[obsType].max.value)
                                       .toEqual(record_array1_summary[obsType].max);
                                   expect(results[obsType].max.timestamp)
                                       .toEqual(record_array1_summary[obsType].maxtime);
                                   if (obsType === 'wind_speed') {
                                       expect(results[obsType].max.dir)
                                           .toEqual(record_array1_summary[obsType].dir);
                                   }
                               }
                               done();
                           });
    });
});

function check_records(actuals, expecteds) {
    expect(actuals.length).toEqual(expecteds.length);
    actuals.forEach((actual, i) => {
        check_record(actual, expecteds[i]);
    });
}

function check_record(actual, expected) {
    expect(actual.timestamp).toEqual(expected.timestamp);
    expect(actual.tags).toEqual(expected.tags);
    expect(Object.keys(actual.fields).sort()).toEqual(Object.keys(expected.fields).sort());
    for (let obs_type of Object.keys(actual.fields)) {
        expect(actual.fields[obs_type]).toBeCloseTo(expected.fields[obs_type], 4);
    }
}