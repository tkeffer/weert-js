/*
 * This allows references to d3 utilities to be done using the familiar d3 tag notation.
 */
import * as interpolate from "d3-interpolate";
import * as transition from "d3-transition";
import * as selection from "d3-selection";
import * as ease from "d3-ease";
import {timeFormat} from "d3-time-format";

export default {
    ...interpolate,
    ...transition,
    ...selection,
    ...ease,
    timeFormat
};