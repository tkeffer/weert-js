/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

export const plotGroupOptions = {
    nXTicks: 5,
    options: {
        recent: {
            xTickFormat: "HH:mm:ss",
        },
        day   : {
            xTickFormat: "HH:mm"
        },
        week  : {
            xTickFormat: "L",
        },
        month : {
            xTickFormat: "L",
        },
        year  : {
            xTickFormat: "L",
        }
    }
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
    }
};

