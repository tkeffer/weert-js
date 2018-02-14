/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

export function findFirstGood(packets, maxAge) {

    if (packets.length) {
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

