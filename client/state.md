# State

Sample state:

```javascript
const state = {

    selectedTimeScale: "day",   // day | week | month | year

    selectedTimeDetail: 5,       // 5 | 10 | 20 | 60 | all

    selectedTags: {
        platform: "default_platform",
        stream  : "default_stream"
    },

    measurements: {
        wxpackets: {
            isFetching : false,
            maxAge     : 300000,
            aggregation: undefined,
            packets    : [
                {
                    timestamp           : 1506713140000,
                    unit_system         : 10,
                    out_temperature     : 22.5,
                    out_humidity_percent: 41
                },
                {
                    timestamp           : 1506713440000,
                    unit_system         : 10,
                    out_temperature     : 22.8,
                    out_humidity_percent: 39
                }
            ],
            stats      : {
                day: {
                    isFetching : false,
                    lastUpdated: 1516749300000,
                    data       : {
                        "out_humidity_percent": {
                            "min": {"value": null, "timestamp": null},
                            "max": {"value": null, "timestamp": null}
                        },
                        "out_temperature"     : {
                            "min": {"value": 11.698117871361, "timestamp": 1516777500000},
                            "max": {"value": 89.4822681921413, "timestamp": 1516749300000}
                        },
                    }

                },
            }
        },
        wxrecords: {
            isFetching : false,
            maxAge     : 691200000,          // = 8 days in milliseconds
            aggregation: 3600000,            // = 1 hour
            packets    : [
                {
                    timestamp           : 1506713140000,
                    unit_system         : 10,
                    out_temperature     : 22.5,
                    out_humidity_percent: 41
                },
                {
                    timestamp           : 1506713440000,
                    unit_system         : 10,
                    out_temperature     : 22.8,
                    out_humidity_percent: 39
                }
            ],
            stats      : {
                day  : {
                    isFetching : false,
                    lastUpdated: 1516749300000,
                    data       : {
                        "out_humidity_percent": {
                            "min": {"value": null, "timestamp": null},
                            "max": {"value": null, "timestamp": null}
                        },
                        "out_temperature"     : {
                            "min": {"value": 11.698117871361, "timestamp": 1516777500000},
                            "max": {"value": 89.4822681921413, "timestamp": 1516749300000}
                        },
                    }

                },
                month: {
                    isFetching : false,
                    lastUpdated: 1516749300000,
                    data       : {
                        "out_humidity_percent": {
                            "min": {"value": null, "timestamp": null},
                            "max": {"value": null, "timestamp": null}
                        },
                        "out_temperature"     : {
                            "min": {"value": 11.698117871361, "timestamp": 1516777500000},
                            "max": {"value": 89.4822681921413, "timestamp": 1516749300000}
                        },
                    }
                }
            }
        }
    }
};
```