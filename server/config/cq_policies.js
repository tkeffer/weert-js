/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Set of default continuous query policies.
 * Right now, there is only one, Standard5, but others,
 * such as daily, could be added.
 */

module.exports = {
    "Standard5": {
        "interval"   : "5m",
        "aggregation": {
            "altimeter_pressure"     : "avg",
            "console_voltage"        : "avg",
            "dewpoint_temp"          : "avg",
            "extra1_humidity"        : "avg",
            "extra1_temp"            : "avg",
            "extra2_humidity"        : "avg",
            "extra2_temp"            : "avg",
            "extra3_temp"            : "avg",
            "gauge_pressure"         : "avg",
            "heatindex_temp"         : "avg",
            "in_humidity"            : "avg",
            "in_temp"                : "avg",
            "in_temp_battery_status" : "last",
            "leaf1_temp"             : "avg",
            "leaf2_temp"             : "avg",
            "out_temp"               : "avg",
            "out_temp_battery_status": "last",
            "radiation_radiation"    : "avg",
            "rain_battery_status"    : "last",
            "rain_rain"              : "sum",
            "sealevel_pressure"      : "avg",
            "soil1_temp"             : "avg",
            "soil2_temp"             : "avg",
            "soil3_temp"             : "avg",
            "soil4_temp"             : "avg",
            "unit_system"            : "last",
            "uv_uv"                  : "avg",
            "wind_speed"             : "avg",
            "windchill_temp"         : "avg",
            "x_wind_speed"           : "avg",
            "y_wind_speed"           : "avg",
        }
    }
};
