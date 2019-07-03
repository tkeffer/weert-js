# State

Sample state:

```javascript
const state = {
  selectedTags: {
    platform: "default_platform",
    stream: "default_stream"
  },

  selectedTimeSpan: "day", //  recent | day | week | month | year

  timeSpans: {
    recent: {
      isFetching: false,
      measurement: "wxpackets",
      options: {
        maxAge: 3600000, // = 1 hour in milliseconds
        selectedTimeDetail: 5 // 5 | 10 | 20 | 60
      },
      packets: [
        {
          timestamp: 1506713140000,
          unit_system: 10,
          out_temperature: 22.5,
          out_humidity_percent: 41
        },
        {
          timestamp: 1506713440000,
          unit_system: 10,
          out_temperature: 22.8,
          out_humidity_percent: 39
        },
        {
          // ...
        }
      ]
    },

    day: {
      isFetching: false,
      measurement: "wxrecords",
      options: {
        maxAge: 97200000,   // = 27 hours in milliseconds
        aggregation: undefined
      },
      packets: [
        {
          timestamp: 1517472300000,
          unit_system: 10,
          out_temperature: 22.5,
          out_humidity_percent: 41
        },
        {
          timestamp: 1517472600000,
          unit_system: 10,
          out_temperature: 22.3,
          out_humidity_percent: 42
        },
        {
          // ...
        }
      ]
    },
    week: {
      isFetching: false,
      measurement: "wxrecords",
      options: {
        maxAge: 604800000,      // = 7 days in milliseconds
        aggregation: 10800000   // = 3 hours in milliseconds
      },
      packets: [
        {
          timestamp: 1517742000000,
          unit_system: 10,
          out_temperature: 35.1,
          out_humidity_percent: 38
        },
        {
          timestamp: 1517752800000,
          unit_system: 10,
          out_temperature: 35.0,
          out_humidity_percent: 39
        },
        {
          // ...
        }
      ]
    },
    month: {
      // ...
    },
    year: {
      // ...
    }
  },

  stats: {
    day: {
      isFetching: false,
      measurement: "wxpackets",
      data: {
        out_humidity_percent: {
          min: { value: null, timestamp: null },
          max: { value: null, timestamp: null }
        },
        out_temperature: {
          min: { value: 11.698117871361, timestamp: 1516777500000 },
          max: { value: 89.4822681921413, timestamp: 1516749300000 }
        }
      }
    },
    week: {
      isFetching: false,
      measurement: "wxrecords",
      data: {
        out_humidity_percent: {
          min: { value: null, timestamp: null },
          max: { value: null, timestamp: null }
        },
        out_temperature: {
          min: { value: 11.698117871361, timestamp: 1516777500000 },
          max: { value: 89.4822681921413, timestamp: 1516749300000 }
        }
      }
    },
    month: {
      // ...
    },
    year: {
      // ...
    }
  },
  
  about: {
    server_uptime : 415833,
    weert_uptime : 16528.58,
    node_version : "v10.15.2",
    weert_version : "0.6.0",
  }
};
```
