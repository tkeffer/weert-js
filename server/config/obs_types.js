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
        subsample: "MEAN(altimeter_pressure)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "console_voltage",
        subsample: "LAST(console_voltage)",
        stats    : ["last"],
    },
    {
        obs_type : "dewpoint_temperature",
        subsample: "MEAN(dewpoint_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "extra1_humidity_percent",
        subsample: "MEAN(extra1_humidity_percent)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "extra1_temperature",
        subsample: "MEAN(extra1_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "gauge_pressure",
        subsample: "MEAN(gauge_pressure)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "heatindex_temperature",
        subsample: "MEAN(heatindex_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "in_humidity_percent",
        subsample: "MEAN(in_humidity_percent)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "in_temperature",
        subsample: "MEAN(in_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "in_temperature_battery_status",
        subsample: "LAST(in_temperature_battery_status)",
    },
    {
        obs_type : "out_humidity_percent",
        subsample: "MEAN(out_humidity_percent)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "out_temperature",
        subsample: "MEAN(out_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "out_temperature_battery_status",
        subsample: "LAST(out_temperature_battery_status)",
    },
    {
        obs_type : "radiation_radiation",
        subsample: "MEAN(radiation_radiation)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "rain_battery_status",
        subsample: "LAST(rain_battery_status)",
    },
    {
        obs_type : "rain_rain",
        subsample: "SUM(rain_rain)",
        stats    : ["sum"],
    },
    {
        obs_type : "sealevel_pressure",
        subsample: "MEAN(sealevel_pressure)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "unit_system",
        subsample: "LAST(unit_system)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "uv_uv",
        subsample: "MEAN(uv_uv)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "wind_dir",
        subsample: fields => {
            const {x_wind_speed, y_wind_speed} = fields;
            if (x_wind_speed == null || y_wind_speed == null) {
                return null;
            }
            let d = 90.0 - (180 / Math.PI) * (Math.atan2(y_wind_speed, x_wind_speed));
            if (d < 0) d += 360.0;
            return d
        },
    },
    {
        obs_type : "wind_speed",
        subsample: "MEAN(wind_speed)",
        stats    : ["min", "max", "mean"],
    },
    {
        obs_type : "windchill_temperature",
        subsample: "MEAN(windchill_temperature)",
        stats    : ["min", "max"],
    },
    {
        obs_type : "windgust_speed",
        subsample: "MAX(wind_speed)",
        stats    : ["max"],
    },
    {
        obs_type : "x_wind_speed",
        subsample: "MEAN(x_wind_speed)",
        stats    : ["sum", "count"],
    },
    {
        obs_type : "y_wind_speed",
        subsample: "MEAN(y_wind_speed)",
        stats    : ["sum", "count"],
    },
];

