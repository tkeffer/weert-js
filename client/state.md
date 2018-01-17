# State

Sample state:

```Javascript
{
    series_name_1: {
        seriesTags: {
            measurement: "wxpackets",
            platform   : "default_platform",
            stream     : "default_stream"
        },
        didInvalidate: false,
        isFetching   : false,
        maxAge       : 300000,
        packets      : [
            {
                timestamp          : 1506713140000,
                unit_system        : 10,
                outside_temperature: 22.5,
                outside_humidity   : 41
            },
            {
                timestamp          : 1506713440000,
                unit_system        : 10,
                outside_temperature: 22.8,
                outside_humidity   : 39
            }
        ]
    },
    series_name_2: {
        seriesTags: {
            measurement: "wxrecords",
            platform   : "default_platform",
            stream     : "default_stream"
        },
        didInvalidate: false,
        isFetching   : false,
        maxAge       : 97200000,           // = 27 hours in milliseconds
        packets      : [
            {
                timestamp          : 1506713140000,
                unit_system        : 10,
                outside_temperature: 22.5,
                outside_humidity   : 41
            },
            {
                timestamp          : 1506713440000,
                unit_system        : 10,
                outside_temperature: 22.8,
                outside_humidity   : 39
            }
        ]
    }
};

```