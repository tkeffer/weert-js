/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import * as _ from "lodash";

export function findFirstGood(packets, maxAge) {
  if (packets.length && maxAge !== undefined) {
    // First, find the first packet less than maxAge old
    const trimTime = Date.now() - maxAge;
    const firstRecent = packets.findIndex(packet => {
      return packet.timestamp >= trimTime;
    });

    // If there was no good packet, skip them all. Otherwise, just
    // up to the first good packet
    return firstRecent === -1 ? packets.length : firstRecent;
  } else {
    return 0;
  }
}

export function insertSorted(packets, packet, maxAge) {
  // Find the first packet we are going to keep:
  const firstGood = findFirstGood(packets, maxAge);
  // Find the insertion point
  const insertPoint = _.sortedIndexBy(packets, packet, p => p.timestamp);
  // Drop the stale packets at the front, keep the other packets, inserting
  // the new packet in the proper spot.
  return [
    ...packets.slice(firstGood, insertPoint),
    packet,
    ...packets.slice(insertPoint)
  ];
}

export function isDevelopment() {
  return !process.env.NODE_ENV || process.env.NODE_ENV === "development";
}

export function isSame(option1, option2) {
  return (
    option1.maxAge === option2.maxAge &&
    option1.aggregation === option2.aggregation
  );
}

// Access a deeply nested value, with thanks to A. Sharif (https://goo.gl/f924sP)
export function getNested(path, obj) {
  return path.reduce(
    (xs, x) => (xs != null && xs[x] != null ? xs[x] : undefined),
    obj
  );
}

// Extract the top-level, non-object key-value pairs from an object.
export function getOptions(obj) {
  return Object.keys(obj).reduce((options, k) => {
    if (typeof obj[k] !== "object") {
      options[k] = obj[k];
    }
    return options;
  }, {});
}
