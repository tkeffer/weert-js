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
            "UV"         : "avg",
            "altimeter"  : "avg",
            "barometer"  : "avg",
            "extraHumid1": "avg",
            "extraHumid2": "avg",
            "extraTemp1" : "avg",
            "extraTemp2" : "avg",
            "extraTemp3" : "avg",
            "inHumidity" : "avg",
            "inTemp"     : "avg",
            "leafTemp1"  : "avg",
            "leafTemp2"  : "avg",
            "leafWet1"   : "avg",
            "leafWet2"   : "avg",
            "outHumidity": "avg",
            "outTemp"    : "avg",
            "pressure"   : "avg",
            "radiation"  : "avg",
            "rain"       : "sum",
            "soilMoist1" : "avg",
            "soilMoist2" : "avg",
            "soilMoist3" : "avg",
            "soilMoist4" : "avg",
            "soilTemp1"  : "avg",
            "soilTemp2"  : "avg",
            "soilTemp3"  : "avg",
            "soilTemp4"  : "avg",
            "xWind"      : "avg",
            "yWind"      : "avg"
        }
    }
};
