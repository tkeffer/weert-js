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
  animationDuration: 500,
  dot: false,
  isAnimationActive: false,
  animationEasing: "linear",
  stroke: "#8884d8",
  strokeWidth: 2,
  debounce: 200,
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
