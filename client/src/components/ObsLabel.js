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
};


export default class ObsLabel extends React.PureComponent {
  render() {
    const { obsType } = this.props;
    return <span>{units.getLabel(obsType)}</span>;
  }
}

ObsLabel.propTypes = propTypes;
