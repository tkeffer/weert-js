/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import PropTypes from "prop-types";

import * as units from "../units";

const propTypes = {
  obsType: PropTypes.string.isRequired,
  value: PropTypes.number,
  unitSystem: PropTypes.number,
  format: PropTypes.string,
  isFetching: PropTypes.bool,
  componentClass: PropTypes.string,
};

const defaultProps = {
  isFetching: false,
  componentClass: "div",
};

export default function ObsValue(props) {
  const { obsType, value, unitSystem, format, isFetching, componentClass: Component } = props;

  const newString = isFetching
    ? "Loading"
    : units.getValueString(obsType, value, unitSystem, format);

  // Use the string as they key. If it changes, React will recognize it as a new component
  // that needs to be rerendered, causing the fade-in.
  return (
    <Component key={newString} className="fadeIn data">
      {newString}
    </Component>
  );
}

ObsValue.propTypes = propTypes;
ObsValue.defaultProps = defaultProps;
