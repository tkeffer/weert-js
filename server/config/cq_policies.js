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
            "altimeter_pressure"                : "avg",
            "console_voltage"                   : "avg",
            "extra1_humidity"                   : "avg",
            "extra1_temperature"                : "avg",
            "extra2_humidity"                   : "avg",
            "extra2_temperature"                : "avg",
            "extra3_temperature"                : "avg",
            "gauge_pressure"                    : "avg",
            "inside_humidity"                   : "avg",
            "inside_temperature"                : "avg",
            "inside_temperature_battery_status" : "avg",
            "leaf1_temperature"                 : "avg",
            "leaf2_temperature"                 : "avg",
            "outside_temperature"               : "avg",
            "outside_temperature_battery_status": "avg",
            "radiation_radiation"               : "avg",
            "rain_battery_status"               : "avg",
            "rain_rain"                         : "sum",
            "sealevel_pressure"                 : "avg",
            "soil1_temperature"                 : "avg",
            "soil2_temperature"                 : "avg",
            "soil3_temperature"                 : "avg",
            "soil4_temperature"                 : "avg",
            "unit_system"                       : "last",
            "uv_uv"                             : "avg",
            "x_wind_speed"                      : "avg",
            "y_wind_speed"                      : "avg",
        }
    }
};
