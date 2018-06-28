/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

export const plotOptions = {
  width: "95%",
  height: 200,
  margin: { top: 5, right: 5, left: 5, bottom: 5 },
  nXTicks: 5,
  type: "linear",
  xTickFormat: "lll",
  yTickFormat: undefined,
  yInterval: "preserveStartEnd",
  animationDuration: 500,
  dot: false,
  activeDot: true, // True to draw dot on mouseover
  isAnimationActive: false,
  animationEasing: "linear",
  stroke: "#8884d8",
  strokeWidth: 2,
  debounce: 200,
  label: false, // True to label plot values
  plotGroups: {
    recent: {
      xTickFormat: "HH:mm:ss",
      plots: [
        {
          plotLines: [
            {
              obsType: "wind_speed"
            }
          ]
        },
        {
          yUnit: "°",
          plotLines: [
            {
              obsType: "out_temperature"
            },
            {
              obsType: "dewpoint_temperature",
              stroke: "blue"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "radiation_radiation"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "sealevel_pressure"
            }
          ]
        }
      ]
    },
    day: {
      header: "This day",
      xTickFormat: "HH:mm",
      plots: [
        {
          plotLines: [
            {
              obsType: "wind_speed"
            }
          ]
        },
        {
          yUnit: "°",
          plotLines: [
            {
              obsType: "out_temperature"
            },
            {
              obsType: "dewpoint_temperature",
              stroke: "blue"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "radiation_radiation"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "sealevel_pressure"
            }
          ]
        }
      ]
    },
    week: {
      header: "This week",
      xTickFormat: "ddd",
      plots: [
        {
          plotLines: [
            {
              obsType: "wind_speed"
            }
          ]
        },
        {
          yUnit: "°",
          plotLines: [
            {
              obsType: "out_temperature"
            },
            {
              obsType: "dewpoint_temperature",
              stroke: "blue"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "radiation_radiation"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "sealevel_pressure"
            }
          ]
        }
      ]
    },
    month: {
      header: "This month",
      xTickFormat: "M/D",
      plots: [
        {
          plotLines: [
            {
              obsType: "wind_speed"
            }
          ]
        },
        {
          yUnit: "°",
          plotLines: [
            {
              obsType: "out_temperature"
            },
            {
              obsType: "dewpoint_temperature",
              stroke: "blue"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "radiation_radiation"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "sealevel_pressure"
            }
          ]
        }
      ]
    },
    year: {
      header: "This year",
      xTickFormat: "M/D/YY",
      plots: [
        {
          plotLines: [
            {
              obsType: "wind_speed"
            }
          ]
        },
        {
          yUnit: "°",
          plotLines: [
            {
              obsType: "out_temperature"
            },
            {
              obsType: "dewpoint_temperature",
              stroke: "blue"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "radiation_radiation"
            }
          ]
        },
        {
          plotLines: [
            {
              obsType: "sealevel_pressure"
            }
          ]
        }
      ]
    }
  }
};

export const statsTableOptions = {
  day: {
    header: "Since midnight",
    timeFormat: "HH:mm:ss"
  },
  week: {
    header: "This week",
    timeFormat: "HH:mm:ss ddd"
  },
  month: {
    header: "This month",
    timeFormat: "HH:mm:ss Do"
  },
  year: {
    header: "This year",
    timeFormat: "HH:mm:ss D-MMM"
  }
};

export const packetTableOptions = {
  obsTypes: [
    "timestamp",
    "wind_speed",
    "out_temperature",
    "in_temperature",
    "radiation_radiation",
    "sealevel_pressure"
  ],
  header: "Current values",
  staleAge: 120000
};
