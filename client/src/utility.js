/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

export function findFirstGood(packets, maxAge) {

    if (packets.length && maxAge !== undefined) {
        // First, find the first packet less than maxAge old
        const trimTime    = Date.now() - maxAge;
        const firstRecent = packets.findIndex((packet) => {
            return packet.timestamp >= trimTime;
        });

        // If there was no good packet, skip them all. Otherwise, just
        // up to the first good packet
        return firstRecent === -1 ? packets.length : firstRecent;
    } else {
        return 0;
    }
}

export function isDevelopment() {
    return !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
}

export function isSame(option1, option2) {
    option1.maxAge === option2.maxAge && option1.start === option2.start && option1.aggregation === option2.aggregation;
}

// Access a deeply nested value, with thanks to A. Sharif (https://goo.gl/f924sP)
export function getNested(path, obj) {
    return path.reduce((xs, x) =>
                        (xs && xs[x]) ? xs[x] : null, obj);
}
