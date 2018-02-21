/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Configuration information for WeeRT observation types
 */
module.exports = [
    {
        obs_type : "altimeter_pressure",
        subsample: "mean(altimeter_pressure)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "console_voltage",
        subsample: "last(console_voltage)",
        stats    : ["last"],
    },
    {
        obs_type : "dewpoint_temperature",
        subsample: "mean(dewpoint_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "extra1_humidity_percent",
        subsample: "mean(extra1_humidity_percent)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "extra1_temperature",
        subsample: "mean(extra1_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "gauge_pressure",
        subsample: "mean(gauge_pressure)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "heatindex_temperature",
        subsample: "mean(heatindex_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "in_humidity_percent",
        subsample: "mean(in_humidity_percent)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "in_temperature",
        subsample: "mean(in_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "in_temperature_battery_status",
        subsample: "last(in_temperature_battery_status)",
    },
    {
        obs_type : "out_humidity_percent",
        subsample: "mean(out_humidity_percent)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "out_temperature",
        subsample: "mean(out_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "out_temperature_battery_status",
        subsample: "last(out_temperature_battery_status)",
    },
    {
        obs_type : "radiation_radiation",
        subsample: "mean(radiation_radiation)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "rain_battery_status",
        subsample: "last(rain_battery_status)",
    },
    {
        obs_type : "rain_rain",
        subsample: "sum(rain_rain)",
        stats    : ["sum"],
    },
    {
        obs_type : "sealevel_pressure",
        subsample: "mean(sealevel_pressure)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "unit_system",
        subsample: "last(unit_system)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "uv_uv",
        subsample: "mean(uv_uv)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "wind_speed",
        subsample: "mean(wind_speed)",
        stats    : ["min", "max", "avg"],
    },
    {
        obs_type : "windchill_temperature",
        subsample: "mean(windchill_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "windgust_speed",
        subsample: "max(wind_speed)",
        stats    : ["max"],
    },
    {
        obs_type : "x_wind_speed",
        subsample: "mean(x_wind_speed)",
        stats    : ["sum", "count"],
    },
    {
        obs_type : "y_wind_speed",
        subsample: "mean(y_wind_speed)",
        stats    : ["sum", "count"],
    },
];

