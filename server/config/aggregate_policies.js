/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

export default {
    'altimeter_pressure'            : 'MEAN(altimeter_pressure)',
    'console_voltage'               : 'LAST(console_voltage)',
    'dewpoint_temperature'          : 'MEAN(dewpoint_temperature)',
    'extra1_humidity_percent'       : 'MEAN(extra1_humidity_percent)',
    'extra1_temperature'            : 'MEAN(extra1_temperature)',
    'gauge_pressure'                : 'MEAN(gauge_pressure)',
    'heatindex_temperature'         : 'MEAN(heatindex_temperature)',
    'in_humidity_percent'           : 'MEAN(in_humidity_percent)',
    'in_temperature'                : 'MEAN(in_temperature)',
    'in_temperature_battery_status' : 'LAST(in_temperature_battery_status)',
    'out_humidity_percent'          : 'MEAN(out_humidity_percent)',
    'out_temperature'               : 'MEAN(out_temperature)',
    'out_temperature_battery_status': 'LAST(out_temperature_battery_status)',
    'radiation_radiation'           : 'MEAN(radiation_radiation)',
    'rain_battery_status'           : 'LAST(rain_battery_status)',
    'rain_rain'                     : 'SUM(rain_rain)',
    'sealevel_pressure'             : 'MEAN(sealevel_pressure)',
    'unit_system'                   : 'LAST(unit_system)',
    'uv_uv'                         : 'MEAN(uv_uv)',
    'wind_dir'                      : fields => {
        const {x_wind_speed, y_wind_speed} = fields;
        if (x_wind_speed == null || y_wind_speed == null) {
            return null;
        }
        let d = 90.0 - (180 / Math.PI) * (Math.atan2(y_wind_speed, x_wind_speed));
        if (d < 0) d += 360.0;
        return d;
    },
    'wind_speed'                    : 'MEAN(wind_speed)',
    'windchill_temperature'         : 'MEAN(windchill_temperature)',
    'windgust_speed'                : 'MAX(wind_speed)',
    'x_wind_speed'                  : 'MEAN(x_wind_speed)',
    'y_wind_speed'                  : 'MEAN(y_wind_speed)',
};