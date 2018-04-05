/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * This allows references to d3 utilities to be done using the familiar d3 tag notation.
 */
import * as ease from "d3-ease";
import * as interpolate from "d3-interpolate";
import * as scale from "d3-scale";
import * as transition from "d3-transition";

export default {
  ...ease,
  ...interpolate,
  ...scale,
  ...transition
};
