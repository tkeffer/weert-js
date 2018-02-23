/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

"use strict";

const async  = require('async');
const _      = require('lodash');
const config = require('../../server/config/config');

const Influx = require('influx');
const influx = new Influx.InfluxDB(config.influxdb);

const MeasurementManager = require('../../server/services/measurement_manager');
const subsampling        = require('../../server/services/subsampling');

// Null measurement config needed for these tests.
const measurement_config = {};

// Just subsample some of the types. This keeps the test packets manageable.
const keep_types = ['out_temperature', 'wind_speed', 'windgust_speed', 'unit_system'];
const obs_types  = require('../../server/config/obs_types')
    .filter(ss => keep_types.includes(ss.obs_type));

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

// Arbitrary values added to the packet fields, to differentiate the two platforms
const baseValues = {
    'platform1': 0,
    'platform2': 5,
};
// Made up functions for the data. The platform number is just added to the returned
// value, to allow the data for each series to be unique.
const valFns = {
    out_temperature: (t, platform) => Math.sin(2.0 * Math.PI * (t - start) / period) + baseValues[platform],
    wind_speed     : (t, platform) => Math.cos(2.0 * Math.PI * (t - start) / period) + baseValues[platform],
    unit_system    : () => 16,
};


function form_deep_packet(t, platform) {

    const obj = {
        tags     : {
            platform: platform,
        },
        fields   : Object.keys(valFns).reduce((packet, obsType) => {
            packet[obsType] = valFns[obsType](t, platform);
            return packet;
        }, {}),
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

function reduce_packets(packets) {
    return packets.reduce((summary, packet) => {
        for (let obsType of Object.keys(packets)) {
            // If we have not seen this type before, initialize
            if (summary[obsType] == null) {
                summary[obsType] = {sum: 0.0, count: 0, max: null};
            }
            if (packet[obsType] != null) {
                summary.sum += packet[obsType];
                summary.count += 1;
                if (summary.max == null || packet[obsType] > summary.max) {
                    summary.max = packet[obsType];
                }
            }
        }
        return summary;
    }, {});
}

function summary_reducer(summary, packet) {
    // Updates a running summary with a packet
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
                        unit_system    : 16,
                    },
                    timestamp: end_of_interval,
                };
                return record;
            });
}

const packet_array1 = expected_packets('platform1');
const packet_array2 = expected_packets('platform2');
const record_array1 = expected_records(packet_array1, 'platform1');
const record_array2 = expected_records(packet_array2, 'platform2');

const packet_array1_summary = packet_array1.reduce(summary_reducer, {});
const record_array1_summary = record_array1.reduce(summary_reducer, {});

// These will be Sets holding the records
const record_sets = {
    platform1: record_array1.reduce((set, record) => set.add(record), new Set()),
    platform2: record_array2.reduce((set, record) => set.add(record), new Set()),
};

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
            platform1: new Set(),
            platform2: new Set(),
        };
        const options      = {
            ...ss_policies[0],
            end_ts: timestamp(nPackets - 1),
        };
        subsampling.subsample(measurement_manager, options, (record) => {
                       // Keep track of all timestamps that have been inserted
                       seen_records[record.tags.platform].add(record);
                   })
                   .then((N_array) => {
                       const [N1, N2] = N_array;
                       expect(N1).toEqual(nRecords);
                       expect(N2).toEqual(nRecords);
                   })
                   .then(() => {
                       measurement_manager.find_packets(test_record_measurement, {platform: 'platform1'})
                                          .then(records => {
                                              expect(records).toEqual(record_array1);
                                              expect(seen_records.platform1).toEqual(record_sets.platform1);
                                              return measurement_manager.find_packets(test_record_measurement,
                                                                                      {platform: 'platform2'});
                                          })
                                          .then(records => {
                                              expect(records).toEqual(record_array2);
                                              expect(seen_records.platform2).toEqual(record_sets.platform2);
                                          });
                       done();
                   });
    });

    it('should calculate stats', function (done) {
        const options = {
            platform: 'platform1',
            now     : start,
        };
        measurement_manager.run_stats(test_record_measurement, obs_types, options)
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
                               }
                               done();
                           });
    });
});

