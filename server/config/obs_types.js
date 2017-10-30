/*
 * Copyright (c) 2016-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Configuration information for WeeRT observation types
 */
module.exports = [
    {
        obs_type : "altimeter_pressure",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "console_voltage",
        subsample: "last",
        stats    : ["last"]

    },
    {
        obs_type : "dewpoint_temperature",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "extra1_humidity",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "extra1_temperature",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "gauge_pressure",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "heatindex_temperature",
        subsample: "avg",
        stats    : ["min", "max"]
    },
    {
        obs_type : "inside_humidity",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "inside_temperature",
        subsample: "avg",
        stats    : ["min", "max"]
    },
    {
        obs_type : "inside_temperature_battery_status",
        subsample: "last"
    },
    {
        obs_type : "outside_temperature",
        subsample: "avg",
        stats    : ["min", "max"]
    },
    {
        obs_type : "outside_temperature_battery_status",
        subsample: "last"
    },
    {
        obs_type : "radiation_radiation",
        subsample: "avg",
        stats    : ["min", "max"]
    },
    {
        obs_type : "rain_battery_status",
        subsample: "last"
    },
    {
        obs_type : "rain_rain",
        subsample: "sum",
        stats    : ["sum"]

    },
    {
        obs_type : "sealevel_pressure",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "unit_system",
        subsample: "last",
        stats    : ["min", "max"]
    },
    {
        obs_type : "uv_uv",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "wind_speed",
        subsample: "avg",
        stats    : ["min", "max", "avg"]

    },
    {
        obs_type : "windchill_temperature",
        subsample: "avg",
        stats    : ["min", "max"]

    },
    {
        obs_type : "x_wind_speed",
        subsample: "avg",
        stats    : ["sum", "count"]

    },
    {
        obs_type : "y_wind_speed",
        subsample: "avg",
        stats    : ["sum", "count"]
    }
];

