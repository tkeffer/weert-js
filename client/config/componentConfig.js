/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

export const plotGroupOptions = {
    nXTicks: 5,
    options: {
        recent: {
            xTickFormat: "HH:mm:ss",
        },
        day   : {
            xTickFormat: "HH:mm",
        },
        week  : {
            xTickFormat: "L",
        },
        month : {
            xTickFormat: "L",
        },
        year  : {
            xTickFormat: "L",
        },
    },
};

export const plotOptions = {
    type             : 'linear',
    stroke           : "#8884d8",
    dot              : false,
    isAnimationActive: false,
    animationDuration: 500,
    animationEasing  : 'linear',
    strokeWidth      : 2,
    plotGroups       : {
        recent: {
            xTickFormat: "HH:mm:ss",
            plots      : [
                {
                    plotLines: [
                        {
                            obsType: 'out_temperature',
                        },
                        {
                            obsType: 'dewpoint_temperature',
                            stroke : 'blue',
                        },
                    ],
                },
            ],
        },
        day   : {
            header     : "This day",
            xTickFormat: "HH:mm",
            plots      : [
                {
                    plotLines: [
                        {
                            obsType: 'out_temperature',
                        },
                        {
                            obsType: 'dewpoint_temperature',
                            stroke : 'blue',
                        },
                    ],
                },
            ],
        },
    },
};

export const statsTableOptions = {
    'day'  : {
        header    : "Since midnight",
        timeFormat: "HH:mm:ss",
    },
    'week' : {
        header    : "This week",
        timeFormat: "HH:mm:ss ddd",
    },
    'month': {
        header    : "This month",
        timeFormat: "HH:mm:ss Do",
    },
    'year' : {
        header    : "This year",
        timeFormat: "HH:mm:ss D-MMM",
    },
};

